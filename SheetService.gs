/**
 * All Sheet access lives here. Uses Script Properties so the Sheet ID
 * isn't hardcoded — set it once in Project Settings > Script Properties.
 *   SHEET_ID   -> the spreadsheet's ID (from its URL)
 *   SHEET_TAB  -> tab name, defaults to "Requests"
 */
var SheetService = (function () {

  function _sheet() {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty('SHEET_ID');
    var tabName = props.getProperty('SHEET_TAB') || 'Requests';
    if (!sheetId) throw new Error('Script Property SHEET_ID is not set.');

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(FIELD_ORDER);
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  function appendRequest(record) {
    var sheet = _sheet();
    var row = FIELD_ORDER.map(function (key) { return record[key] !== undefined ? record[key] : ''; });
    sheet.appendRow(row);
  }

  function updateLinksById(id, docxUrl, pdfUrl, status) {
    var sheet = _sheet();
    var idCol = FIELD_ORDER.indexOf('id') + 1;
    var docxCol = FIELD_ORDER.indexOf('docxUrl') + 1;
    var pdfCol = FIELD_ORDER.indexOf('pdfUrl') + 1;
    var statusCol = FIELD_ORDER.indexOf('status') + 1;

    var data = sheet.getRange(2, idCol, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === id) {
        var row = i + 2;
        sheet.getRange(row, docxCol).setValue(docxUrl);
        sheet.getRange(row, pdfCol).setValue(pdfUrl);
        sheet.getRange(row, statusCol).setValue(status);
        return;
      }
    }
  }

  function getAllRequests() {
    var sheet = _sheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var values = sheet.getRange(2, 1, lastRow - 1, FIELD_ORDER.length).getValues();
    return values.map(function (row) {
      var obj = {};
      FIELD_ORDER.forEach(function (key, i) {
        var val = row[i];
        obj[key] = (val instanceof Date) ? val.toISOString() : val;
      });
      return obj;
    }).reverse(); // newest first
  }

  return {
    appendRequest: appendRequest,
    updateLinksById: updateLinksById,
    getAllRequests: getAllRequests
  };
})();
