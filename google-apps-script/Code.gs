/**
 * HASH BROWN — Lead form backend
 * Receives a POST from the website contact form, appends a row to the
 * connected Google Sheet, and emails a notification to the team.
 *
 * Setup: see DEPLOY-INSTRUCTIONS.md
 */

// Your leads spreadsheet ID (the long string in the sheet URL).
var SHEET_ID = '1CGiIlH6buMuhllyaoDurrQCBa3UAuPctwmhFEFb-Mj4';

// The tab (sheet) name to write leads into. Created automatically if missing.
var SHEET_NAME = 'Leads';

// Where lead notifications are sent.
var NOTIFY_EMAIL = 'hashbrownconsulting@gmail.com';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(20000);
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    var name    = String(p.name    || '').trim();
    var company = String(p.company || '').trim();
    var email   = String(p.email   || '').trim();
    var note    = String(p.note    || '').trim();
    var page    = String(p.page    || '').trim();

    // Basic server-side validation (mirrors the front end).
    if (!name || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ result: 'error', message: 'Missing required fields.' });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Company', 'Email', 'Note', 'Source page']);
      sheet.getRange('A1:F1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var ts = new Date();
    sheet.appendRow([ts, name, company, email, note, page]);

    // Email notification.
    var subject = 'New website lead — ' + name + ' (' + company + ')';
    var bodyText =
      'New lead submitted from the Hash Brown website.\n\n' +
      'Name:    ' + name + '\n' +
      'Company: ' + company + '\n' +
      'Email:   ' + email + '\n' +
      'Note:    ' + (note || '(none)') + '\n' +
      'Page:    ' + (page || '(unknown)') + '\n' +
      'Time:    ' + ts + '\n\n' +
      'Row added to the Leads sheet: ' + ss.getUrl();

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject,
      body: bodyText,
      replyTo: email,
      name: 'Hash Brown Website'
    });

    return json({ result: 'success' });
  } catch (err) {
    return json({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// A GET on the URL just confirms the endpoint is live (handy for testing).
function doGet() {
  return json({ result: 'ok', message: 'Hash Brown lead endpoint is live.' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
