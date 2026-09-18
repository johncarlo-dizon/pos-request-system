# Setup

## 1. Create the Apps Script project
1. Go to script.google.com → New Project.
2. Delete the default `Code.gs` content, then create these files (matching names exactly)
   and paste in the contents from this package:
   - `Code.gs`, `Utils.gs`, `SheetService.gs`, `DocService.gs`
   - `FormPage.html`, `FormStyle.html`, `FormScript.html`
   - `ManagementPage.html`, `ManagementStyle.html`, `ManagementScript.html`
3. Open **Project Settings** (gear icon) and paste in `appsscript.json`'s content via
   "Show appsscript.json manifest file in editor" → edit that file directly.

## 2. Create the Google Sheet (database)
1. Create a new blank Google Sheet — this is your database. Name it e.g. "POS Requests DB".
2. You don't need to add headers manually — `SheetService.gs` creates a `Requests` tab with
   the correct header row automatically on first submission. (You can also rename the tab;
   just make sure the `SHEET_TAB` property below matches.)
3. Copy the Sheet's ID from its URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.

## 3. Create the Doc template + output folder
1. Follow `TEMPLATE_GUIDE.md` to turn your original `.docx` into a Google Doc with
   `{{merge_tags}}` in place of every `INPUT` / checkbox / blank.
2. Create a Drive folder where generated `.docx` / `.pdf` files should be saved
   (e.g. "POS Requests — Generated Docs"). Copy its folder ID from its URL.

## 4. Set Script Properties
In the Apps Script editor: **Project Settings → Script Properties → Add script property**,
add all four:

| Property | Value |
|---|---|
| `SHEET_ID` | the Sheet ID from step 2 |
| `SHEET_TAB` | `Requests` (optional — this is the default if omitted) |
| `TEMPLATE_DOC_ID` | the template Doc's ID from step 3 |
| `OUTPUT_FOLDER_ID` | the output folder's ID from step 3 |

## 5. Deploy as a Web App
1. **Deploy → New deployment → type: Web app**.
2. Execute as: **Me**. Who has access: set to whoever should be able to submit requests
   (e.g. "Anyone within [your org]").
3. Deploy, then authorize the requested scopes (Sheets, Drive, Docs) when prompted —
   these are needed to read/write the Sheet, copy the template, and export docx/pdf.
4. The deployment URL opens the **Request Form** by default.
   Append `?page=management` for the **Management** page.

## How it flows
1. User fills the form → clicks **Submit Request**.
2. `submitRequest()` generates the ID (`REQ-YYYYMMDD-HHmmss`), writes a row to the Sheet,
   copies the template Doc, replaces all `{{tags}}`, exports it as `.docx` and `.pdf` into
   the output Drive folder, deletes the intermediate Doc copy, and writes both file links
   (+ status `Generated`) back into that Sheet row.
3. The Management page reads the Sheet on load and renders a searchable/filterable table
   with links to both generated files.

## Notes / things you may want to adjust
- Access to generated files follows the output folder's sharing settings — if people
  outside your org need to open the links, share that folder accordingly (or add a line
  in `DocService.gs` to call `.setSharing(...)` on each file after creation).
- `Session.getScriptTimeZone()` drives the `REQ-YYYYMMDD-HHmmss` timestamp — it's already
  set to `Asia/Manila` in `appsscript.json`; change that if a different timezone applies.
- Date inputs use the browser's native `<input type="date">`, stored as ISO (`YYYY-MM-DD`)
  and converted to `DD / MM / YYYY` server-side in `Utils.gs formatDMY()` before being
  merged into the document.
