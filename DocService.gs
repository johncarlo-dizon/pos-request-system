/**
 * Generates the filled-in docx + pdf from a Google Doc template that
 * contains {{merge_tag}} placeholders (see TEMPLATE_GUIDE.md for the
 * exact tags to paste into that template).
 *
 * Script Properties required (Project Settings > Script Properties):
 *   TEMPLATE_DOC_ID   -> the Google Doc template's file ID
 *   OUTPUT_FOLDER_ID  -> the Drive folder where generated files are saved
 */
var DocService = (function () {

  function _props() {
    var props = PropertiesService.getScriptProperties();
    var templateId = props.getProperty('TEMPLATE_DOC_ID');
    var folderId = props.getProperty('OUTPUT_FOLDER_ID');
    if (!templateId) throw new Error('Script Property TEMPLATE_DOC_ID is not set.');
    if (!folderId) throw new Error('Script Property OUTPUT_FOLDER_ID is not set.');
    return { templateId: templateId, folderId: folderId };
  }

  /** Escapes {{ }} for use inside Body#replaceText, which takes a regex. */
  function _tag(name) {
    return '\\{\\{' + name + '\\}\\}';
  }

  function _buildTagMap(record) {
    var map = {
      doc_ref: record.id,
      store_code: record.storeCode,
      request_date: record.requestDate,
      target_golive_date: record.targetGoLiveDate,
      requested_by: record.requestedBy,

      peak_hour_transactions: record.peakHourTransactions,
      target_hourly_capacity: record.targetHourlyCapacity,
      avg_queue_time: record.avgQueueTime,
      expected_queue_time: record.expectedQueueTime,
      est_monthly_revenue: record.estMonthlyRevenue,
      projected_revenue_increase: record.projectedRevenueIncrease,
      alternative_solutions: record.alternativeSolutions,

      counter_space_mark: checkMark(record.counterSpace),
      ac_power_mark: checkMark(record.acPowerOutlet),
      lan_port_mark: checkMark(record.lanPort),

      am_name: record.amName,
      am_date: record.amDate
    };

    APPROVAL_ROLES.forEach(function (role) {
      var decision = record[role.key + 'Decision'];
      map[role.key + '_name'] = record[role.key + 'Name'];
      map[role.key + '_approved_mark'] = decisionMark(decision, 'approved');
      map[role.key + '_rejected_mark'] = decisionMark(decision, 'rejected');
      map[role.key + '_date'] = record[role.key + 'Date'];
    });

    return map;
  }

  /** Exports a Google Doc file as docx or pdf via the authenticated fetch (no Advanced Service needed). */
  function _exportBlob(fileId, format) {
    var url = 'https://docs.google.com/document/d/' + fileId + '/export?format=' + format;
    var res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      throw new Error('Export to ' + format + ' failed: HTTP ' + res.getResponseCode());
    }
    return res.getBlob();
  }

  function generateDocuments(record) {
    var cfg = _props();
    var folder = DriveApp.getFolderById(cfg.folderId);
    var templateFile = DriveApp.getFileById(cfg.templateId);

    // 1. Copy the template and fill in the merge tags
    var copy = templateFile.makeCopy(record.id, folder);
    var doc = DocumentApp.openById(copy.getId());
    var body = doc.getBody();

    var tagMap = _buildTagMap(record);
    Object.keys(tagMap).forEach(function (key) {
      var value = (tagMap[key] === undefined || tagMap[key] === null) ? '' : String(tagMap[key]);
      body.replaceText(_tag(key), value);
    });
    doc.saveAndClose();

    // 2. Export to docx + pdf, save both as separate files
    var docxBlob = _exportBlob(copy.getId(), 'docx').setName(record.id + '.docx');
    var pdfBlob = _exportBlob(copy.getId(), 'pdf').setName(record.id + '.pdf');

    var docxFile = folder.createFile(docxBlob);
    var pdfFile = folder.createFile(pdfBlob);

    // 3. Remove the intermediate Google Doc copy — only the real .docx/.pdf files remain
    copy.setTrashed(true);

    return {
      docxUrl: docxFile.getUrl(),
      pdfUrl: pdfFile.getUrl()
    };
  }

  return { generateDocuments: generateDocuments };
})();
