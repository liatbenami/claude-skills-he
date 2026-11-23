/**
 * שרת הרשמות לסדנה / ריטריט / אירוע.
 *
 * מה שצריך לשנות נמצא בשני הבלוקים הראשונים: CFG ו-EVENT.
 * כל השאר כללי ועובד כמו שהוא.
 *
 * מה הוא עושה:
 *   1. מקבל הרשמה מהטופס באתר
 *   2. יש מקום פנוי  -> רושם בגיליון "נרשמות" ושולח מייל עם כפתור תשלום
 *      אין מקום פנוי -> רושם בגיליון "רשימת המתנה" ושולח מייל שמסביר את זה
 *   3. כשמתפנה מקום (נרשמת מסומנת "בוטל") - מעלה את הראשונה בתור
 *      ושולח לה את מייל התשלום
 *
 * התקנה:
 *   א. script.google.com/home -> הפרויקט -> מדביקים את הקוד -> Ctrl+S
 *   ב. פריסה -> ניהול פריסות -> ✏️ -> פריסה
 *   ג. לאוטומציה של רשימת ההמתנה: שעון ⏰ בתפריט השמאלי -> הוספת טריגר ->
 *      פונקציה: checkWaitlist | מקור: מבוסס זמן | כל שעה
 */

var CFG = {
  sheetId:  'PASTE_SHEET_ID',            // מתוך כתובת הגיליון, בין /d/ ל-/edit
  mainName: 'נרשמות',
  waitName: 'רשימת המתנה',
  capacity: 15,                          // 0 = בלי הגבלת תפוסה
  notify:   'manager@example.com',       // מי מקבל התראה על כל הרשמה. אפשר כמה, מופרדים בפסיק
  replyTo:  'manager@example.com',       // לאן חוזרת תשובה של נרשמת. כתובת אחת בלבד!
  tz:       'Asia/Jerusalem'
};

var EVENT = {
  name:     'שם האירוע',
  date:     'יום ותאריך',
  hours:    '00:00 – 00:00',
  place:    'שם המקום, כתובת',
  parking:  '',                          // ריק = לא יוצג
  price:    '000 ₪',
  includes: '',                          // מה כלול במחיר. ריק = לא יוצג
  payLink:  '',                          // קישור איסוף כסף בביט. ריק = יוצג רק המספר
  bitPhone: '050-0000000',
  waPhone:  '972500000000',              // בינלאומי, בלי + ובלי 0 מוביל
  site:     'https://example.com'
};

var HEADERS = ['תאריך הרשמה', 'שם מלא', 'טלפון', 'אימייל', 'שבוע הריון', 'סטטוס תשלום', 'הערות'];
var STATUS_OPTIONS = ['טרם שולם', 'שולם בביט', 'שולם באחר', 'בוטל'];

/* ========================= קבלת הרשמה ========================= */

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (!p.full_name || !p.phone || !p.email) {
      return json({ ok: false, error: 'missing_fields' });
    }

    var ss = SpreadsheetApp.openById(CFG.sheetId);
    var main = sheetByName(ss, CFG.mainName);

    // capacity 0 פירושו בלי הגבלת תפוסה - כולן נכנסות
    if (!CFG.capacity || activeCount(main) < CFG.capacity) {
      appendRegistration(main, p, '');
      confirmRegistered(p);
      notifyManager(p, false);
      return json({ ok: true, waitlist: false });
    }

    var wait = sheetByName(ss, CFG.waitName);
    var position = activeCount(wait) + 1;
    appendRegistration(wait, p, 'מקום ' + position + ' בתור');
    confirmWaitlist(p, position);
    notifyManager(p, true);
    return json({ ok: true, waitlist: true, position: position });

  } catch (err) {
    console.error('registration failed: ' + err + ' | ' + JSON.stringify(e && e.parameter));
    return json({ ok: false, error: 'server_error' });
  }
}

/* ========================= גיליונות ========================= */

/** מחזיר גיליון לפי שם, ויוצר אותו בפורמט זהה אם אינו קיים. */
function sheetByName(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;

  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sh.setRightToLeft(true);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#7A124D')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  var widths = [150, 170, 180, 180, 140, 140, 140];
  for (var i = 0; i < widths.length; i++) sh.setColumnWidth(i + 1, widths[i]);

  sh.getRange(2, 6, 500, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).build());

  return sh;
}

/** כמה נרשמות תופסות מקום בפועל - כלומר בלי המבוטלות. */
function activeCount(sheet) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return 0;
  var status = sheet.getRange(2, 6, rows, 1).getValues();
  var n = 0;
  for (var i = 0; i < rows; i++) {
    if (String(status[i][0]).trim() !== 'בוטל') n++;
  }
  return n;
}

function appendRegistration(sheet, p, note) {
  sheet.appendRow([
    Utilities.formatDate(new Date(), CFG.tz, 'dd/MM/yyyy HH:mm'),
    p.full_name,
    "'" + String(p.phone).trim(),   // גרש מונע מגוגל למחוק את ה-0 המוביל
    p.email,
    p.pregnancy_week || '',
    'טרם שולם',
    note || ''
  ]);
}

/* ===================== רשימת המתנה ===================== */

/**
 * רץ אוטומטית בטריגר שעתי: אם התפנה מקום ויש מישהי בתור -
 * מעלה אותה לגיליון הנרשמות ושולחת לה את מייל התשלום.
 */
function checkWaitlist() {
  var ss = SpreadsheetApp.openById(CFG.sheetId);
  var main = sheetByName(ss, CFG.mainName);
  var wait = ss.getSheetByName(CFG.waitName);
  if (!wait || wait.getLastRow() < 2) return;

  var promoted = 0;
  var rowIndex = firstWaitingRow(wait);

  while ((!CFG.capacity || activeCount(main) < CFG.capacity) && rowIndex) {
    var row = wait.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];

    main.appendRow([
      Utilities.formatDate(new Date(), CFG.tz, 'dd/MM/yyyy HH:mm'),
      row[1],
      "'" + String(row[2]).replace(/^'/, '').trim(),
      row[3],
      row[4],
      'טרם שולם',
      'עלתה מרשימת ההמתנה'
    ]);
    wait.deleteRow(rowIndex);

    confirmPromoted({ full_name: row[1], email: row[3] });
    promoted++;
    rowIndex = firstWaitingRow(wait);
  }

  if (promoted) {
    notifyPlain(
      'התפנו מקומות: ' + promoted + ' נרשמות עלו מרשימת ההמתנה',
      '<p>' + promoted + ' נרשמות הועברו מרשימת ההמתנה לגיליון הנרשמות, ' +
      'וקיבלו מייל עם קישור לתשלום.</p>');
  }
}

/** מספר השורה הראשונה בתור שעדיין ממתינה (לא בוטלה). 0 אם אין. */
function firstWaitingRow(wait) {
  var rows = wait.getLastRow() - 1;
  if (rows < 1) return 0;
  var status = wait.getRange(2, 6, rows, 1).getValues();
  for (var i = 0; i < rows; i++) {
    if (String(status[i][0]).trim() !== 'בוטל') return i + 2;
  }
  return 0;
}

/* ========================= מיילים ========================= */

function confirmRegistered(p) {
  send(p.email, 'ההרשמה שלך ל' + EVENT.name + ' התקבלה 🌸', shell(
    'קיבלנו את ההרשמה שלך 🌸',
    hi(p) +
    '<p style="margin:0 0 18px">המקום שלך שמור, ולהשלמת ההרשמה נותר רק להעביר את התשלום.</p>' +
    detailsTable() +
    payBlock('להשלמת ההרשמה ושריון סופי של המקום:')
  ));
}

function confirmWaitlist(p, position) {
  send(p.email, 'את ברשימת ההמתנה ל' + EVENT.name + '', shell(
    'נרשמת לרשימת ההמתנה',
    hi(p) +
    '<p style="margin:0 0 14px">האירוע מלא כרגע — אנחנו שומרות על קבוצה אינטימית של ' +
      CFG.capacity + ' משתתפות בלבד, וכל המקומות נתפסו.</p>' +
    '<div style="background:#e8ece1;border-radius:14px;padding:16px 18px;margin:0 0 20px;text-align:center">' +
      '<div style="font-size:15px;color:#5c6752;margin-bottom:2px">המקום שלך בתור</div>' +
      '<div style="font-size:32px;font-weight:bold;color:#7A124D">' + position + '</div>' +
    '</div>' +
    '<p style="margin:0 0 18px"><strong>אין צורך לשלם כלום בשלב הזה.</strong> ' +
      'אם יתפנה מקום נעדכן אותך במייל, ורק אז יישלח אלייך קישור לתשלום.</p>' +
    detailsTable()
  ));
}

function confirmPromoted(p) {
  send(p.email, 'התפנה מקום ב' + EVENT.name + ' 🌸', shell(
    'התפנה מקום, והוא שלך 🌸',
    hi(p) +
    '<p style="margin:0 0 18px">התפנה מקום באירוע ועלית מרשימת ההמתנה. ' +
      'המקום שמור לך, ולהשלמת ההרשמה נותר להעביר את התשלום.</p>' +
    detailsTable() +
    payBlock('לשריון סופי של המקום:')
  ));
}

function notifyManager(p, isWaitlist) {
  notifyPlain(
    (isWaitlist ? 'רשימת המתנה: ' : 'הרשמה חדשה: ') + p.full_name,
    '<p><b>שם:</b> ' + p.full_name + '</p>' +
    '<p><b>טלפון:</b> <a href="https://wa.me/972' +
      String(p.phone).replace(/\D/g, '').replace(/^0/, '') + '">' + p.phone + '</a></p>' +
    '<p><b>אימייל:</b> ' + p.email + '</p>' +
    '<p><b>שבוע הריון:</b> ' + (p.pregnancy_week || '—') + '</p>' +
    '<p><b>נרשמה בגיליון:</b> ' + (isWaitlist ? CFG.waitName : CFG.mainName) + '</p>' +
    (isWaitlist
      ? '<p style="color:#b00">האירוע מלא. היא קיבלה מייל שמסביר שהיא בהמתנה, ולא התבקשה לשלם.</p>'
      : '<p style="color:#666">היא קיבלה מייל עם קישור לתשלום. לעדכן "שולם בביט" בגיליון כשהכסף מגיע.</p>'));
}

function notifyPlain(subject, bodyHtml) {
  if (!CFG.notify) return;
  try {
    MailApp.sendEmail({
      to: CFG.notify,
      name: EVENT.name,
      subject: subject,
      htmlBody: '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px">' +
                '<h2 style="color:#7A124D">' + subject + '</h2>' + bodyHtml + '</div>'
    });
  } catch (err) {
    console.error('notify failed: ' + err);
  }
}

function send(to, subject, html) {
  if (!to) return;
  try {
    MailApp.sendEmail({
      to: to,
      replyTo: CFG.replyTo,
      name: EVENT.name,
      subject: subject,
      htmlBody: html
    });
  } catch (err) {
    // מייל שנכשל לא מפיל את ההרשמה - היא כבר נשמרה בגיליון
    console.error('mail to ' + to + ' failed: ' + err);
  }
}

/* ---------- אבני בניין של המיילים ---------- */

/** מעטפת משותפת לכל המיילים, כדי שכולם ייראו כמו אותו מותג. */
function shell(title, body) {
  return '' +
  '<div dir="rtl" style="margin:0;padding:26px 14px;background:#f7ecda;' +
    'font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#2e2a24">' +
    '<div style="max-width:560px;margin:0 auto">' +

      '<div style="text-align:center;padding:0 0 18px">' +
        '<div style="font-size:13px;letter-spacing:.14em;color:#7A124D;font-weight:bold">נושמות לידה</div>' +
        '<div style="font-size:12px;color:#6b6456">ריטריט להריוניות · הלידה והיום שאחרי</div>' +
      '</div>' +

      '<div style="background:#ffffff;border-radius:20px;padding:30px 26px">' +
        '<h1 style="color:#7A124D;font-size:23px;line-height:1.35;margin:0 0 14px">' + title + '</h1>' +
        body +
        '<hr style="border:none;border-top:1px solid #e8ece1;margin:24px 0 16px">' +
        '<p style="font-size:14px;color:#6b6456;margin:0">' +
          'שאלה? אפשר להשיב למייל הזה או לכתוב לנו ב' +
          '<a href="https://wa.me/' + EVENT.waPhone + '" style="color:#7A124D">וואטסאפ</a>.<br>' +
          '<a href="' + EVENT.site + '" style="color:#7A124D">לעמוד האירוע</a>' +
        '</p>' +
      '</div>' +

      '<p style="text-align:center;font-size:12px;color:#9b9486;margin:16px 0 0">' +
        '' + EVENT.name + ' · ' + EVENT.place + '</p>' +
    '</div>' +
  '</div>';
}

function hi(p) {
  var first = String(p.full_name || '').trim().split(' ')[0];
  return '<p style="margin:0 0 14px">' + (first ? first + ' היקרה, ' : '') + 'שמחות שאת איתנו.</p>';
}

function detailsTable() {
  // שדה ריק ב-EVENT פשוט לא מוצג, כדי שלא תהיה שורה ריקה במייל
  var rows = detailRow('מתי', EVENT.date + '<br>' + EVENT.hours);
  rows += detailRow('איפה', EVENT.place + (EVENT.parking
    ? '<br><span style="color:#6b6456;font-size:14px">' + EVENT.parking + '</span>' : ''));
  rows += detailRow('עלות', EVENT.price + (EVENT.includes
    ? '<br><span style="color:#6b6456;font-size:14px">' + EVENT.includes + '</span>' : ''));
  return '<table style="width:100%;border-collapse:collapse;margin:0 0 22px">' + rows + '</table>';
}

function detailRow(label, value) {
  return '<tr>' +
    '<td style="padding:8px 0;vertical-align:top;color:#6b6456;width:58px;' +
      'border-bottom:1px solid #f0efe8">' + label + '</td>' +
    '<td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #f0efe8">' +
      '<strong>' + value + '</strong></td>' +
  '</tr>';
}

function payBlock(lead) {
  var html = '<p style="margin:0 0 14px"><strong>' + lead + '</strong></p>';

  if (EVENT.payLink) {
    html +=
      '<div style="text-align:center;margin:0 0 16px">' +
        '<a href="' + EVENT.payLink + '" style="display:inline-block;background:#00b2a9;' +
          'color:#ffffff;text-decoration:none;font-weight:bold;font-size:18px;' +
          'padding:16px 34px;border-radius:50px">' +
          'לתשלום ' + EVENT.price + ' ב-bit</a>' +
      '</div>' +
      '<p style="font-size:14px;color:#6b6456;margin:0">' +
        'הסכום כבר מוגדר בקישור. לחלופין אפשר להעביר ב-bit ל-' + EVENT.bitPhone +
        ' ולציין את שמך בהערה.</p>';
  } else {
    html +=
      '<div style="text-align:center;margin:0 0 16px">' +
        '<div style="display:inline-block;border:2px dashed #00b2a9;border-radius:14px;' +
          'padding:14px 28px;font-size:22px;font-weight:bold" dir="ltr">' +
          EVENT.bitPhone + '</div>' +
      '</div>' +
      '<p style="font-size:14px;color:#6b6456;margin:0">' +
        'להעברת ' + EVENT.price + ' ב-bit למספר הזה. אנא ציינו את השם המלא בהערה.</p>';
  }
  return html;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
