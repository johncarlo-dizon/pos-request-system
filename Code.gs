/**
 * POS ADDITIONAL UNIT REQUEST SYSTEM
 * Entry point: routing + the two functions the client calls via google.script.run
 *
 * Deploy as Web App. Two pages, chosen by ?page= query param:
 *   (no param) or ?page=form         -> Request Form (main page)
 *   ?page=management                 -> Management / records page
 */

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'form';
  var templateName = (page === 'management') ? 'ManagementPage' : 'FormPage';

  var template = HtmlService.createTemplateFromFile(templateName);
  template.baseUrl = ScriptApp.getService().getUrl();   // add this line
  return template.evaluate()
      .setTitle(page === 'management' ? 'POS Requests – Management' : 'POS Additional Unit Request')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Lets HTML files pull in separate CSS/JS files via <?!= include('FileName'); ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Called from FormScript.html on submit.
 * data: plain object matching the fields listed in Utils.gs FIELD_ORDER (form-side subset).
 * Returns { success, id, docxUrl, pdfUrl, error }
 */
function submitRequest(data) {
  try {
    if (!data || !data.storeCode || !data.requestDate || !data.targetGoLiveDate || !data.requestedBy) {
      throw new Error('Missing required fields.');
    }

    var id = generateDocRef();
    var timestamp = new Date();

    var record = buildRecordFromForm(id, timestamp, data);

    // 1. Save to Sheet first (so we never lose the submission even if doc-gen fails)
    SheetService.appendRequest(record);

    // 2. Generate the docx + pdf from the template, upload to Drive
    var docs = DocService.generateDocuments(record);

    // 3. Update the sheet row with the resulting links + status
    SheetService.updateLinksById(id, docs.docxUrl, docs.pdfUrl, 'Generated');

    return {
      success: true,
      id: id,
      docxUrl: docs.docxUrl,
      pdfUrl: docs.pdfUrl
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/** Called from ManagementScript.html to populate the records table. */
function getAllRequests() {
  return SheetService.getAllRequests();
}

function testManagement() {
  var output = doGet({ parameter: { page: 'management' } });
  var html = output.getContent();
  Logger.log('Length: ' + html.length);
  Logger.log(html.substring(0, 1000));
}
