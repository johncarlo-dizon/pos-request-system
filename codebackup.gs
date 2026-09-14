/**
 * BC-POS Request System — Apps Script Backend
 * ---------------------------------------------
 * Handles:
 *   - doPost action=submit   -> append new row to Sheet
 *   - doPost action=update   -> update status/approval fields on existing row
 *   - doPost action=generate -> create Google Doc + PDF in Drive, save links back to Sheet
 *   - doGet                  -> return all records as JSON (for management UI)
 *
 * SETUP (fill these in before deploying):
 */
const SPREADSHEET_ID = '1C-alFikPqiIy_Ups63b3jl8CGoDcbbpoJ2bjDigNJm8';
const SHEET_NAME      = 'Requests';
const DRIVE_FOLDER_ID = '1lx63TBcQTsqIV12z80q4P26S6tyDM3sY';

// Column order — MUST match the header row in the Sheet exactly.
//
// FIX: added 'hasEmergencyAttachment' after 'costCurrency'. This field is
// rendered in print (Section 5, "Unbudgeted" notice) but was previously
// never captured by the frontend or written to the Sheet at all.
//
// IMPORTANT: after deploying this, add a matching header cell
// "hasEmergencyAttachment" to the Sheet's row 1, in this exact position,
// or the positional row-building in handleSubmit_ will desync with doGet /
// handleGenerate_ (which read by header name, not position).
const COLUMNS = [
  'id', 'timestamp', 'status',
  'storeInfo', 'storeManager', 'areaManager',
  'requestDate', 'targetGoLiveDate', 'leadTimeDays',
  'primaryDriver', 'growthPercentage', 'currentWaitTime', 'targetWaitStandard', 'seasonalDetails',
  'currTx', 'projTx', 'currQueue', 'projQueue', 'currRev', 'projRevInc',
  'alternativeSolutions',
  'infraCounter', 'infraPower', 'infraLan',
  'assetType',
  'budgetStatus', 'estimatedCost', 'costCurrency', 'hasEmergencyAttachment',
  'smName', 'smCheck', 'smDate',
  'amName', 'amCheck', 'amDate',
  'itName', 'itCheck', 'itDate',
  'fasName', 'fasCheck', 'fasDate',
  'docLink', 'pdfLink'
];

function getSheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateId_() {
  return 'POS-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const records = data.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return jsonOut_({ ok: true, records });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'submit') return handleSubmit_(body.data);
    if (action === 'update') return handleUpdate_(body.id, body.data);
    if (action === 'generate') return handleGenerate_(body.id);

    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function handleSubmit_(data) {
  const sheet = getSheet_();
  const headers = getHeaders_(sheet);
  const id = generateId_();
  const row = headers.map(col => {
    if (col === 'id') return id;
    if (col === 'timestamp') return new Date();
    if (col === 'status') return 'Submitted';
    if (col === 'docLink' || col === 'pdfLink') return '';
    return data[col] !== undefined ? data[col] : '';
  });
  sheet.appendRow(row);
  return jsonOut_({ ok: true, id: id, status: 'Submitted' });
}

function findRowIndexById_(sheet, id) {
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // +2: skip header, 1-indexed
  }
  return -1;
}

function handleUpdate_(id, data) {
  const sheet = getSheet_();
  const headers = getHeaders_(sheet);
  const rowIndex = findRowIndexById_(sheet, id);
  if (rowIndex === -1) return jsonOut_({ ok: false, error: 'Record not found: ' + id });

  Object.keys(data).forEach(key => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(data[key]);
    }
  });
  return jsonOut_({ ok: true, id: id });
}

function handleGenerate_(id) {
  const sheet = getSheet_();
  const rowIndex = findRowIndexById_(sheet, id);
  if (rowIndex === -1) return jsonOut_({ ok: false, error: 'Record not found: ' + id });

  const headers = getHeaders_(sheet);
  const rowValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const record = {};
  headers.forEach((h, i) => record[h] = rowValues[i]);

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const docName = `${record.id}_${record.storeInfo || 'Unnamed'}`;

  // If a doc was already generated before, remove the old files first (overwrite behavior)
  if (record.docLink) {
    try {
      const oldDocId = extractIdFromUrl_(record.docLink);
      if (oldDocId) DriveApp.getFileById(oldDocId).setTrashed(true);
    } catch (e) { /* ignore if already gone */ }
  }
  if (record.pdfLink) {
    try {
      const oldPdfId = extractIdFromUrl_(record.pdfLink);
      if (oldPdfId) DriveApp.getFileById(oldPdfId).setTrashed(true);
    } catch (e) { /* ignore if already gone */ }
  }

  // Build the Google Doc — styled with tables/borders to mirror the printed form layout
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(50).setMarginRight(50);

  // ---- Header banner ----
  // FIX: print's header banner has, in order: "Formal Business Case" tag,
  // title, a subtitle line, Doc Ref, and the asset-based Lead Time badge.
  // Previously the tag was missing, the subtitle text was invented instead
  // of matching print, and the Lead Time badge had drifted down into
  // Section 4 instead of staying in the header where print puts it.
  const badgeTag = body.appendParagraph('FORMAL BUSINESS CASE');
  badgeTag.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  badgeTag.editAsText().setBold(true).setFontSize(8).setForegroundColor('#0369a1');

  const title = body.appendParagraph('ADDITIONAL POS UNIT REQUEST');
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const subtitle = body.appendParagraph('Submit enterprise justification for capital allocation & hardware deployment');
  subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  subtitle.editAsText().setItalic(true).setForegroundColor('#555555');

  const refLine = body.appendParagraph(`Doc Ref: ${record.id}    |    Status: ${record.status || 'Submitted'}`);
  refLine.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  refLine.editAsText().setFontSize(9).setForegroundColor('#666666');

  const leadBadge = body.appendParagraph(`Lead Time: ${computeDeploymentSpeed_(record.assetType)}`);
  leadBadge.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  leadBadge.editAsText().setBold(true).setFontSize(9).setForegroundColor('#92400e');

  body.appendParagraph(' ');

  // ---- Section 1: Request Information ----
  // FIX: added "Lead Time Status" row — print shows this as a colored tag
  // (Expedited / Standard / Extended) next to the calculated day count;
  // previously only the raw day count reached the Doc.
  addSectionHeading_(body, '1. Request Information');
  addKeyValueTable_(body, [
    ['Store Name / Code', record.storeInfo],
    ['Requested By (Store Manager)', record.storeManager],
    ['Area / District Manager', record.areaManager],
    ['Request Date', record.requestDate],
    ['Target Go-Live Date', record.targetGoLiveDate],
    ['Calculated Lead Time', `${record.leadTimeDays || '--'} days`],
    ['Lead Time Status', computeLeadTimeStatus_(record.leadTimeDays)]
  ]);
  body.appendParagraph(' ');

  // ---- Section 2: Business Justification ----
  addSectionHeading_(body, '2. Business Justification', SECTION_SUBTITLES_.driver);
  const driverRows = [['Primary Driver', record.primaryDriver || '—']];
  // FIX: print shows a one-line description under whichever driver card is
  // selected (e.g. "Significant sustained increase in store register
  // traffic...") — that context was previously lost entirely.
  if (record.primaryDriver && DRIVER_DESCRIPTIONS_[record.primaryDriver]) {
    driverRows.push(['Driver Description', DRIVER_DESCRIPTIONS_[record.primaryDriver]]);
  }
  if (record.growthPercentage) driverRows.push(['Transaction Volume Growth', `${record.growthPercentage}%`]);
  if (record.currentWaitTime) driverRows.push(['Peak Wait Time (Current / Target)', `${record.currentWaitTime} min / ${record.targetWaitStandard} min`]);
  if (record.seasonalDetails) driverRows.push(['Campaign / Event Details', record.seasonalDetails]);
  addKeyValueTable_(body, driverRows);
  body.appendParagraph(' ');

  // ---- Section 3: Impact & Metrics (matches the 4-column table on the form) ----
  addSectionHeading_(body, '3. Impact & Metrics Comparison', SECTION_SUBTITLES_.metrics);
  // FIX: header text now includes "(With POS)" to match print exactly.
  const metricsTable = body.appendTable(toCellRows_([
    ['Key Metric', 'Current Baseline', 'Projected Target (With POS)', 'Expected Uplift'],
    [`Peak Hour Transactions (${METRIC_LABEL_SUBTEXT_['Peak Hour Transactions']})`, String(record.currTx || '--'), String(record.projTx || '--'), computeTxUplift_(record.currTx, record.projTx)],
    [`Average Queue Time (min) (${METRIC_LABEL_SUBTEXT_['Average Queue Time (min)']})`, String(record.currQueue || '--'), String(record.projQueue || '--'), computeQueueDelta_(record.currQueue, record.projQueue)],
    [`Monthly Store Revenue (${METRIC_LABEL_SUBTEXT_['Monthly Store Revenue']})`, String(record.currRev || '--'), `+${record.projRevInc || 0}`, computeRevUplift_(record.currRev, record.projRevInc)]
  ]));
  styleTable_(metricsTable, true);
  body.appendParagraph(' ');

  // FIX: print's DOM order is label → hint → textarea. The previous version
  // printed the hint before the label, reversing print's actual order.
  const altLabel = body.appendParagraph('Alternative Solutions Evaluated:');
  altLabel.editAsText().setBold(true).setFontSize(10);

  const altHint = body.appendParagraph(ALT_SOLUTIONS_HINT_);
  altHint.editAsText().setItalic(true).setFontSize(9).setForegroundColor('#64748b');

  const altText = body.appendParagraph(record.alternativeSolutions || '—');
  altText.editAsText().setFontSize(10);
  body.appendParagraph(' ');

  // ---- Section 4: Site Readiness & Asset ----
  addSectionHeading_(body, '4. Site Readiness & Asset Preference', SECTION_SUBTITLES_.site);
  // FIX: print shows the "Store Infrastructure Checklist" heading with its
  // status badge ("Checklist Pending (0/3)") BEFORE the three checklist
  // items — the previous version listed the items first and the status
  // last, reversing print's order. "Deployment Speed" is removed from here
  // entirely since that badge actually belongs in the header banner (see
  // above), not this section — it was misplaced before.
  const infraHeading = body.appendParagraph('Store Infrastructure Checklist');
  infraHeading.editAsText().setBold(true).setFontSize(9).setForegroundColor('#334155');
  const infraStatusPara = body.appendParagraph(computeInfraStatus_(record.infraCounter, record.infraPower, record.infraLan));
  infraStatusPara.editAsText().setBold(true).setFontSize(9).setForegroundColor('#92400e');

  addKeyValueTable_(body, [
    [`Counter Space Ready (${INFRA_ITEM_SUBTEXT_['Counter Space Ready']})`, record.infraCounter ? 'YES' : 'NO'],
    [`Dedicated AC Outlet (${INFRA_ITEM_SUBTEXT_['Dedicated AC Outlet']})`, record.infraPower ? 'YES' : 'NO'],
    [`Active Network LAN (${INFRA_ITEM_SUBTEXT_['Active Network LAN']})`, record.infraLan ? 'YES' : 'NO']
  ]);
  body.appendParagraph(' ');

  addKeyValueTable_(body, [
    ['Asset Type Requested', record.assetType || '—'],
    ['Asset Type Description', (record.assetType && ASSET_DESCRIPTIONS_[record.assetType]) || '—']
  ]);
  body.appendParagraph(' ');

  // ---- Section 5: Financial ----
  // FIX: print nests the emergency-memo line directly under the
  // "Unbudgeted" radio option, i.e. between Budget Status and Estimated
  // Investment — the previous version appended it last, after Estimated
  // Investment, reversing that order. Also restored the cost footnote
  // that print shows under the investment field.
  addSectionHeading_(body, '5. Financial & Budget Allocation', SECTION_SUBTITLES_.financial);
  const financialRows = [
    ['Budget Allocation Status', record.budgetStatus || '—']
  ];
  if (record.budgetStatus && String(record.budgetStatus).indexOf('Unbudgeted') !== -1) {
    financialRows.push([
      'Emergency Justification Memo',
      record.hasEmergencyAttachment ? 'ATTACHED' : 'NOT ATTACHED — REQUIRED'
    ]);
  }
  financialRows.push(['Estimated Investment', `${record.costCurrency || ''} ${record.estimatedCost || '--'}`]);
  addKeyValueTable_(body, financialRows);

  const costFootnote = body.appendParagraph('* Cost estimation filled out in coordination with IT / FAS Asset Management.');
  costFootnote.editAsText().setItalic(true).setFontSize(8).setForegroundColor('#94a3b8');
  body.appendParagraph(' ');

  // ---- Section 6: Approval Grid (4-column table like the sign-off cards) ----
  addSectionHeading_(body, '6. Approval & Governance Gate', SECTION_SUBTITLES_.approval);
  const approvalTable = body.appendTable(toCellRows_([
    ['Store Manager', 'Area Manager', 'IT Department', 'FAS / Finance'],
    [record.smName || '—', record.amName || '—', record.itName || '—', record.fasName || '—'],
    [
      record.smCheck ? 'APPROVED' : 'PENDING',
      record.amCheck ? 'APPROVED' : 'PENDING',
      record.itCheck ? 'APPROVED' : 'PENDING',
      record.fasCheck ? 'APPROVED' : 'PENDING'
    ],
    [record.smDate || '', record.amDate || '', record.itDate || '', record.fasDate || '']
  ]));
  styleApprovalTable_(approvalTable);

  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  // Move the generated document with the supported single-step API. The old
  // addFile/removeFile pair can fail with "Invalid argument" for some Drive
  // folder types and leaves the document in an inconsistent location.
  docFile.moveTo(folder);

  // Export PDF version into the same folder
  const pdfBlob = docFile.getAs('application/pdf').setName(docName + '.pdf');
  const pdfFile = folder.createFile(pdfBlob);

  // Print now opens this file directly instead of using the browser's print
  // dialog, so anyone with the link — including approvers without Drive
  // access to DRIVE_FOLDER_ID — needs to be able to view it.
  try {
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    // Domain sharing policies may forbid public links; the file is still
    // generated and remains available to users with Drive access.
  }

  const docLink = docFile.getUrl();
  const pdfLink = pdfFile.getUrl();

  // Write links + status back into the same row
  const docLinkCol = headers.indexOf('docLink') + 1;
  const pdfLinkCol = headers.indexOf('pdfLink') + 1;
  const statusCol  = headers.indexOf('status') + 1;
  sheet.getRange(rowIndex, docLinkCol).setValue(docLink);
  sheet.getRange(rowIndex, pdfLinkCol).setValue(pdfLink);
  sheet.getRange(rowIndex, statusCol).setValue('Generated');

  return jsonOut_({ ok: true, id: id, docLink: docLink, pdfLink: pdfLink });
}

// ---- Doc-building helpers ----

// Converts any Sheet value (Date object, number, boolean, null, string) into a safe
// plain string for use in a Document table cell. This is the fix for the
// "parameters (number[]) don't match appendTable" error — Sheets auto-converts
// date-looking values into real Date objects, which appendTable() rejects.
function safeText_(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

// Maps every cell in a 2D array through safeText_ before it reaches appendTable
function toCellRows_(rows) {
  return rows.map(row => row.map(cell => safeText_(cell)));
}

function addSectionHeading_(body, text, subtitle) {
  const p = body.appendParagraph(text);
  p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p.editAsText().setForegroundColor('#0c4a6e');

  // FIX: print shows a small gray line under most section headings
  // ("Select primary driver and provide required specifics", etc.) that
  // was previously dropped entirely from the generated Doc/PDF.
  if (subtitle) {
    const sub = body.appendParagraph(subtitle);
    sub.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    sub.editAsText().setItalic(true).setFontSize(9).setForegroundColor('#64748b');
  }

  const border = body.appendParagraph('');
  border.editAsText().setFontSize(2);
}

// ---- Static copy mirrored from the form's print view ----
// These aren't user-entered data — they're the descriptive text under each
// section heading, each driver/asset option, and each field hint. Print
// renders them from the HTML directly; the Doc/PDF needs them hardcoded
// here since handleGenerate_ only ever sees stored data, not markup.

const SECTION_SUBTITLES_ = {
  driver: 'Select primary driver and provide required specifics',
  metrics: 'Enter baseline metrics to calculate projected operational ROI',
  site: 'Ensure store physical prerequisites are met prior to request dispatch',
  financial: 'Specify accounting source and capital estimation',
  approval: 'Sign-off flow for enterprise authorization and deployment trigger'
};

const DRIVER_DESCRIPTIONS_ = {
  'Sales Volume Growth': 'Significant sustained increase in store register traffic over recent months.',
  'Customer Queue Mitigation': 'Peak hour queue duration exceeds allowable SLA threshold.',
  'Store Footprint Expansion': 'Physical layout modifications or newly constructed counter space.',
  'Seasonal / Promo Peak': 'Anticipated surge due to upcoming campaigns, holidays, or events.'
};

const ASSET_DESCRIPTIONS_ = {
  'Refurbished / Good Stock Unit': 'Faster allocation from central buffer pool (approx 7–14 days setup lead time).',
  'New Unit Procurement': 'Brand new hardware procurement. Subject to standard 60–90 day vendor procurement lead time.'
};

const ALT_SOLUTIONS_HINT_ = "Why can't existing staff scheduling, queue reallocation, or handheld line-busting resolve this issue?";

const METRIC_LABEL_SUBTEXT_ = {
  'Peak Hour Transactions': 'Items / hour processed',
  'Average Queue Time (min)': 'Customer wait time (minutes)',
  'Monthly Store Revenue': 'Total monthly store sales'
};

const INFRA_ITEM_SUBTEXT_ = {
  'Counter Space Ready': 'Cleared & physically sized',
  'Dedicated AC Outlet': 'UPS / Clean surge line',
  'Active Network LAN': 'Verified RJ45 ethernet drop'
};

// Simple 2-column label/value table, bordered, label column bold+shaded — mirrors the form's field rows
function addKeyValueTable_(body, rows) {
  const table = body.appendTable(toCellRows_(rows));
  table.setBorderWidth(1);
  table.setBorderColor('#cbd5e1');
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    const labelCell = row.getCell(0);
    const valueCell = row.getCell(1);
    labelCell.setBackgroundColor('#f1f5f9');
    labelCell.setWidth(180);
    labelCell.editAsText().setBold(true).setFontSize(9).setForegroundColor('#334155');
    valueCell.editAsText().setFontSize(10).setForegroundColor('#0f172a');
  }
}

// Styles the 4-column metrics table — header row shaded dark, borders throughout
function styleTable_(table, shadeHeader) {
  table.setBorderWidth(1);
  table.setBorderColor('#cbd5e1');
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      cell.editAsText().setFontSize(9);
      if (r === 0 && shadeHeader) {
        cell.setBackgroundColor('#0f172a');
        cell.editAsText().setForegroundColor('#ffffff').setBold(true);
      }
    }
  }
}

// Styles the approval grid — role names bold header row, status row color-coded like the stamps on the form
function styleApprovalTable_(table) {
  table.setBorderWidth(1);
  table.setBorderColor('#cbd5e1');
  const roleRow = table.getRow(0);
  const statusRow = table.getRow(2);
  for (let c = 0; c < roleRow.getNumCells(); c++) {
    roleRow.getCell(c).setBackgroundColor('#f1f5f9');
    roleRow.getCell(c).editAsText().setBold(true).setFontSize(9);

    const nameCell = table.getRow(1).getCell(c);
    nameCell.editAsText().setFontSize(9);

    const statusCell = statusRow.getCell(c);
    const isApproved = statusCell.getText() === 'APPROVED';
    statusCell.setBackgroundColor(isApproved ? '#d1fae5' : '#e2e8f0');
    statusCell.editAsText()
      .setBold(true)
      .setFontSize(8)
      .setForegroundColor(isApproved ? '#065f46' : '#475569');

    const dateCell = table.getRow(3).getCell(c);
    dateCell.editAsText().setFontSize(8).setForegroundColor('#64748b');
  }
}

// ---- Metric badge text, mirrors the live badges shown on the form ----
function computeTxUplift_(curr, proj) {
  curr = parseFloat(curr) || 0;
  proj = parseFloat(proj) || 0;
  if (curr > 0 && proj > curr) return `+${Math.round(((proj - curr) / curr) * 100)}% Capacity`;
  return '+0% Capacity';
}

function computeQueueDelta_(curr, proj) {
  curr = parseFloat(curr) || 0;
  proj = parseFloat(proj) || 0;
  if (curr > 0 && proj < curr) return `-${(curr - proj).toFixed(1)} mins wait`;
  return '0 mins reduction';
}

function computeRevUplift_(currRev, projInc) {
  currRev = parseFloat(currRev) || 0;
  projInc = parseFloat(projInc) || 0;
  if (currRev > 0 && projInc > 0) return `+${((projInc / currRev) * 100).toFixed(1)}% Rev Uplift`;
  return '+0% Rev Uplift';
}

// ---- NEW: derived status helpers, mirroring the frontend's live DOM/CSS
// logic exactly, so the Doc/PDF shows the same qualitative labels print does. ----

// Mirrors calculateLeadTime()'s statusTag logic in the frontend.
function computeLeadTimeStatus_(days) {
  days = parseFloat(days) || 0;
  if (!days || days <= 0) return '—';
  if (days < 60) return 'Expedited / Emergency Stock Buffer';
  if (days <= 90) return 'Standard Lead Time';
  return 'Extended Lead Time';
}

// Mirrors updateLeadTimeNote()'s header badge logic in the frontend.
function computeDeploymentSpeed_(assetType) {
  if (assetType && String(assetType).indexOf('Refurbished') !== -1) {
    return 'Fast Deployment (Buffer Pool, ~7–14 days)';
  }
  return 'Standard Procurement Cycle (~60–90 days)';
}

// Mirrors updateInfraStatus()'s badge logic in the frontend.
function computeInfraStatus_(counter, power, lan) {
  const count = (counter ? 1 : 0) + (power ? 1 : 0) + (lan ? 1 : 0);
  if (count === 3) return 'Site Fully Ready (3/3)';
  if (count > 0) return `Partially Ready (${count}/3)`;
  return 'Checklist Pending (0/3)';
}

function extractIdFromUrl_(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}