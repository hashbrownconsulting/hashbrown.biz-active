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

/**
 * Run ONCE from the editor (select setupScorecard, click Run) to create a
 * "Scorecard" tab and a Status dropdown on the Leads sheet. Safe to run again:
 * it never overwrites an existing Scorecard tab.
 *
 * How scoring works: enter 1 to 5 for each factor you have real data for and
 * leave the rest BLANK. A blank is "missing", never zero. The score is the
 * weighted average of the factors you filled in, and "Weight covered" shows
 * how much of the total weight that is. Treat a score with low coverage as a
 * guess. Label each input actual, estimated or assumption in the Notes column.
 */
function setupScorecard() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Status dropdown on the Leads sheet (column P).
  var leads = ss.getSheetByName(SHEET_NAME);
  if (leads) {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['New', 'Qualified', 'Call booked', 'Won', 'Lost', 'Not a fit'], true)
      .setAllowInvalid(true).build();
    leads.getRange(2, 16, 999, 1).setDataValidation(rule);
  }

  if (ss.getSheetByName('Scorecard')) {
    Logger.log('Scorecard tab already exists, left unchanged.');
    return;
  }
  var sh = ss.insertSheet('Scorecard');

  var factors = ['Commercial search demand', 'Keyword competitiveness (5 = easier)',
                 'CPC and intent', 'Qualified enquiry volume', 'Deal value',
                 'Conversion and revenue'];
  var weights = [0.20, 0.15, 0.15, 0.20, 0.15, 0.15];
  var industries = ['telecommunications', 'data-centres', 'ai-software', 'crypto-web3',
                    'logistics', 'recruitment', 'energy', 'finance', 'real-estate', 'commodities'];

  sh.getRange('A1').setValue('Industry scorecard. Enter 1 to 5 where you have data. Leave blank if missing (never 0).')
    .setFontWeight('bold');
  sh.getRange('A2').setValue('Weights');
  sh.getRange(2, 2, 1, 6).setValues([weights]).setNumberFormat('0%');

  var header = ['Industry'].concat(factors,
    ['Weight covered', 'Score (1 to 5)', 'Enquiries', 'Qualified or better', 'Won',
     'Notes (label each input: actual, estimated, assumption)']);
  sh.getRange(3, 1, 1, header.length).setValues([header]).setFontWeight('bold').setWrap(true);
  sh.setFrozenRows(3);

  for (var i = 0; i < industries.length; i++) {
    var r = 4 + i;
    sh.getRange(r, 1).setValue(industries[i]);
    // H: share of the total weight that has data. I: weighted average of filled factors.
    sh.getRange(r, 8).setFormula('=SUMPRODUCT($B$2:$G$2,--(B' + r + ':G' + r + '<>""))').setNumberFormat('0%');
    sh.getRange(r, 9).setFormula('=IF(H' + r + '=0,"",SUMPRODUCT($B$2:$G$2,B' + r + ':G' + r + ')/H' + r + ')').setNumberFormat('0.0');
    // J to L: counted from the Leads sheet, using the Industry (H) and Status (P) columns.
    sh.getRange(r, 10).setFormula('=COUNTIF(Leads!$H:$H,A' + r + ')');
    sh.getRange(r, 11).setFormula('=COUNTIFS(Leads!$H:$H,A' + r + ',Leads!$P:$P,"Qualified")+COUNTIFS(Leads!$H:$H,A' + r + ',Leads!$P:$P,"Call booked")+COUNTIFS(Leads!$H:$H,A' + r + ',Leads!$P:$P,"Won")');
    sh.getRange(r, 12).setFormula('=COUNTIFS(Leads!$H:$H,A' + r + ',Leads!$P:$P,"Won")');
  }
  var scoreRule = SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).setAllowInvalid(false).build();
  sh.getRange(4, 2, industries.length, 6).setDataValidation(scoreRule);
  sh.setColumnWidth(1, 160);
  sh.setColumnWidths(2, 11, 120);
  sh.setColumnWidth(13, 320);
  sh.getRange(15, 1).setValue('Enquiries are counted from the Leads sheet by the Industry tag. Set Status on each lead (New, Qualified, Call booked, Won, Lost, Not a fit). Leads from the homepage have no industry tag.');
}
