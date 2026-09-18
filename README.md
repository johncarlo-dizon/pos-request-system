# POS Request System

A Google Apps Script-based web application for submitting and managing POS additional unit requests. The project includes a request form, document generation, and a management dashboard for viewing request records and generated files.

## Overview

This system lets staff submit a request for a POS-related addition or change. When a request is submitted:

- a record is created in a Google Sheet,
- a document template is copied and merged with the submitted values,
- both a `.docx` and `.pdf` are generated,
- the file links are stored back to the sheet,
- the management page displays all requests in a searchable, filterable table.

## Features

- Request form for submitting POS additional unit requests
- Auto-generated request IDs using a timestamp-based format
- Google Sheet storage for request records
- Document generation from a Google Doc template
- PDF export for generated requests
- Management dashboard for viewing status and generated files
- Search and filtering of requests in the management page
- Deployment as a Google Apps Script web app

## Project Structure

- `Code.gs` – main Apps Script entry points, routing, and submission logic
- `Utils.gs` – shared helper functions and field mappings
- `SheetService.gs` – Google Sheets integration and database operations
- `DocService.gs` – template copying, document merge, and export logic
- `FormPage.html` – request form interface
- `FormStyle.html` – form styling
- `FormScript.html` – form submit behavior
- `ManagementPage.html` – management dashboard interface
- `ManagementStyle.html` – management page styling
- `ManagementScript.html` – management page loading and filtering logic
- `appsscript.json` – Apps Script manifest
- `setup.md` – setup and deployment guide
- `templateguide.md` – template creation instructions

## How It Works

1. A user opens the request form.
2. The form is submitted through Apps Script.
3. A unique request ID is generated.
4. The request data is written to the Google Sheet.
5. A copy of the Google Doc template is created.
6. Template variables are replaced with submitted values.
7. The document is exported as both `.docx` and `.pdf`.
8. Resulting file links are saved back to the sheet.
9. The management page reads the sheet and displays records.

## Deployment Setup

Follow the steps in `setup.md` to configure the project:

1. Create a new Google Apps Script project.
2. Add the project files from this repository.
3. Create a Google Sheet as the database.
4. Create the Google Doc template and output folder.
5. Add the required script properties:
   - `SHEET_ID`
   - `SHEET_TAB`
   - `TEMPLATE_DOC_ID`
   - `OUTPUT_FOLDER_ID`
6. Deploy the project as a web app.

## Required Script Properties

The Apps Script project expects the following properties:

- `SHEET_ID` – ID of the Google Sheet used to store request data
- `SHEET_TAB` – tab name for the request records (default usually `Requests`)
- `TEMPLATE_DOC_ID` – ID of the Google Doc template used for generation
- `OUTPUT_FOLDER_ID` – ID of the Drive folder for generated files

## Access and Permissions

The project requires access to:

- Google Sheets
- Google Drive
- Google Docs

These permissions are needed for reading and writing request records and generating files.

## Accessing the App

- Request form: default deployment page
- Management page: append `?page=management` to the deployed web app URL

## Notes

- The app uses the script timezone configured in the Apps Script project. The configuration currently targets `Asia/Manila`.
- Generated files are stored in the output Drive folder and their links are written back to the sheet.
- Template placeholders in the document must match the request fields expected by the script.

## Customization

You can adapt this system by:

- updating the form fields in the HTML and field mapping logic,
- modifying the Google Doc template to match your document structure,
- changing the sheet tab or output folder configuration,
- adjusting the request ID or date formatting logic in the Apps Script files.

## Related Files

- `setup.md` – installation and configuration steps
- `templateguide.md` – document template instructions

## License

This project is intended for internal or organizational use and can be adjusted to fit your business workflow.
