/**
 * BC-POS Management Dashboard — READ-ONLY Backend
 * -------------------------------------------------
 * This is a SEPARATE Apps Script project from the main submission/
 * generation backend. It does not modify, depend on, or get deployed
 * alongside that script. Its only job is to read the same Google Sheet
 * and hand records back to the management dashboard (HTML/CSS/JS) as JSON.
 *
 * It never writes to the Sheet — no submit/update/generate actions live
 * here. If you later want the dashboard to trigger actions (e.g. approve
 * a record), add that as its own explicit action, reviewed separately —
 * don't extend this file's scope silently.
 *
 * SETUP:
 *  1. Create a NEW Apps Script project (script.google.com -> New project).
 *     Do NOT paste this into your existing POS request backend project.
 *  2. Paste this file's contents in as Code.gs.
 *  3. Set SPREADSHEET_ID below to the SAME Sheet ID your main backend uses
 *     (copy it from your existing script — it's the same Sheet, just a
 *     second, read-only door into it).
 *  4. Deploy -> New deployment -> Web app.
 *     - Execute as: Me
 *     - Who has access: Anyone (or "Anyone within [org]" if you want it
 *       restricted to your company's Google Workspace)
 *  5. Copy the deployment URL into management.js's APPS_SCRIPT_URL constant.
 */
const SPREADSHEET_ID = '1C-alFikPqiIy_Ups63b3jl8CGoDcbbpoJ2bjDigNJm8'; // must match the main backend's Sheet
const SHEET_NAME      = 'Requests';

function getSheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doGet — the dashboard's only entry point.
 *   ?           -> { ok:true, records: [...] }         (all records, newest first)
 *   ?id=POS-xxx -> { ok:true, record: {...} } or an error if not found
 *
 * Reads headers directly from the Sheet's row 1 (not from a hardcoded
 * column list), so it stays correct even if the main backend's COLUMNS
 * array changes shape later — it just reflects whatever is actually there.
 */
function doGet(e) {
  try {
    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();

    const records = data
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      })
      .filter(r => r.id); // skip any blank trailing rows

    // Newest first, based on the timestamp column
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const requestedId = e && e.parameter && e.parameter.id;
    if (requestedId) {
      const record = records.find(r => r.id === requestedId);
      if (!record) return jsonOut_({ ok: false, error: 'Record not found: ' + requestedId });
      return jsonOut_({ ok: true, record: record });
    }

    return jsonOut_({ ok: true, records: records });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}
