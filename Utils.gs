/**
 * Shared helpers: doc-ref generation, formatting, and the canonical
 * list of columns used by both the Sheet and the Doc template.
 */

// Column order for the Sheet. Keep Code.gs / SheetService.gs / DocService.gs in sync with this.
var FIELD_ORDER = [
  'id', 'timestamp', 'status',
  'storeCode', 'requestDate', 'targetGoLiveDate', 'requestedBy',
  'peakHourTransactions', 'targetHourlyCapacity',
  'avgQueueTime', 'expectedQueueTime',
  'estMonthlyRevenue', 'projectedRevenueIncrease',
  'alternativeSolutions',
  'counterSpace', 'acPowerOutlet', 'lanPort',
  'amName', 'amDate',
  'bmName', 'bmDecision', 'bmDate',
  'categoryName', 'categoryDecision', 'categoryDate',
  'itName', 'itDecision', 'itDate',
  'baName', 'baDecision', 'baDate',
  'fasName', 'fasDecision', 'fasDate',
  'accountingName', 'accountingDecision', 'accountingDate',
  'docxUrl', 'pdfUrl'
];

// The 5 approval roles below Area Manager. label/tagPrefix drive both the
// sheet columns above (bm*, category*, it*, ba*, fas*, accounting*) and the
// merge tags used in the Doc template (see TEMPLATE_GUIDE.md).
var APPROVAL_ROLES = [
  { key: 'bm', label: 'BM / DBM Manager' },
  { key: 'category', label: 'Category' },
  { key: 'it', label: 'IT' },
  { key: 'ba', label: 'BA' },
  { key: 'fas', label: 'FAS' },
  { key: 'accounting', label: 'Accounting' }
];

/** Generates REQ-YYYYMMDD-HHmmss using the Apps Script server date/time + project timezone. */
function generateDocRef() {
  var tz = Session.getScriptTimeZone();
  var stamp = Utilities.formatDate(new Date(), tz, "yyyyMMdd'-'HHmmss");
  return 'REQ-' + stamp;
}

/** "2026-09-16" (date input value) -> "16 / 09 / 2026" to match the template's DD / MM / YYYY look. */
function formatDMY(isoDateString) {
  if (!isoDateString) return '';
  var parts = isoDateString.split('-'); // [yyyy, mm, dd]
  if (parts.length !== 3) return isoDateString;
  return parts[2] + ' / ' + parts[1] + ' / ' + parts[0];
}

/** "2026-09-17" (date input value) -> "17 - 09 - 2026", for signature-line dates (template already has a slash before the tag). */
function formatDMYDash(isoDateString) {
  if (!isoDateString) return '';
  var parts = isoDateString.split('-'); // [yyyy, mm, dd]
  if (parts.length !== 3) return isoDateString;
  return parts[2] + ' - ' + parts[1] + ' - ' + parts[0];
}

/** true/'true'/'yes' -> checkmark, everything else -> X, matching the sample's [✓]/[x] style. */
function checkMark(value) {
  var truthy = (value === true || value === 'true' || value === 'yes' || value === 'on');
  return truthy ? '✓' : '✗';
}

/** Returns '✓' if decision === expected ('approved' | 'rejected'), else a blank space (keeps the box empty). */
function decisionMark(decision, expected) {
  return (decision === expected) ? '✓' : ' ';
}

/**
 * Turns the raw form payload into the flat record object that gets
 * written to the Sheet and handed to DocService.
 */
function buildRecordFromForm(id, timestamp, data) {
  var record = {
    id: id,
    timestamp: timestamp,
    status: 'Submitted',

    storeCode: data.storeCode || '',
    requestDate: formatDMY(data.requestDate),
    targetGoLiveDate: formatDMY(data.targetGoLiveDate),
    requestedBy: data.requestedBy || '',

    peakHourTransactions: data.peakHourTransactions || '',
    targetHourlyCapacity: data.targetHourlyCapacity || '',
    avgQueueTime: data.avgQueueTime || '',
    expectedQueueTime: data.expectedQueueTime || '',
    estMonthlyRevenue: data.estMonthlyRevenue || '',
    projectedRevenueIncrease: data.projectedRevenueIncrease || '',
    alternativeSolutions: data.alternativeSolutions || '',

    counterSpace: data.counterSpace ? 'yes' : 'no',
    acPowerOutlet: data.acPowerOutlet ? 'yes' : 'no',
    lanPort: data.lanPort ? 'yes' : 'no',

    amName: data.amName || '',
    amDate: formatDMYDash(data.amDate),

    docxUrl: '',
    pdfUrl: ''
  };

  APPROVAL_ROLES.forEach(function (role) {
    record[role.key + 'Name'] = data[role.key + 'Name'] || '';
    record[role.key + 'Decision'] = data[role.key + 'Decision'] || ''; // '', 'approved', or 'rejected'
    record[role.key + 'Date'] = formatDMYDash(data[role.key + 'Date']);
  });

  return record;
}
