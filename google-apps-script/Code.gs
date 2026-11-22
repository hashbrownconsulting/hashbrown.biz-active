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

// Column order. The first six are unchanged, so existing rows stay valid.
// Status, Est. value and Owner are for you to fill in; the scorecard reads them.
var HEADERS = ['Timestamp', 'Name', 'Company', 'Email', 'Note', 'Source page',
               'Heard via', 'Industry', 'Service', 'Landing page', 'Referrer',
               'UTM source', 'UTM medium', 'UTM campaign', 'UTM industry',
               'Status', 'Est. value', 'Owner'];

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
    var extra = ['heard', 'industry', 'service', 'landing', 'referrer',
                 'utm_source', 'utm_medium', 'utm_campaign', 'utm_industry'].map(function (k) {
      return String(p[k] || '').trim().slice(0, 200);
    });

    // Basic server-side validation (mirrors the front end).
    if (!name || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ result: 'error', message: 'Missing required fields.' });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() < HEADERS.length) {
      // Existing sheet from before industry tagging: add the new headers to the right.
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    }

    var ts = new Date();
    sheet.appendRow([ts, name, company, email, note, page].concat(extra, ['New', '', '']));

    // Email notification.
    var subject = 'New website lead — ' + name + ' (' + company + ')';
    var bodyText =
      'New lead submitted from the Hash Brown website.\n\n' +
      'Name:    ' + name + '\n' +
      'Company: ' + company + '\n' +
      'Email:   ' + email + '\n' +
      'Note:    ' + (note || '(none)') + '\n' +
      'Page:    ' + (page || '(unknown)') + '\n' +
      'Industry: ' + (extra[1] || '(none)') + '   Service: ' + (extra[2] || '(none)') + '\n' +
      'Heard via: ' + (extra[0] || '(not given)') + '\n' +
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
