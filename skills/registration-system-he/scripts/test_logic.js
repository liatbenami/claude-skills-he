/**
 * בדיקת הלוגיקה של Code.gs בלי לגעת בגיליון אמיתי ובלי לשלוח מייל.
 *
 *     node test_logic.js ../assets/Code.gs
 *
 * מחליפה את SpreadsheetApp ו-MailApp בזיופים שמחזיקים הכל בזיכרון, ואז
 * מריצה ארבעה תרחישים: תפוסה מלאה, רשימת המתנה, ביטול והעלאה, ותפוסה
 * ללא הגבלה. שווה להריץ אחרי כל שינוי ב-CFG או ב-EVENT, לפני שמדביקים
 * את הקוד ל-Apps Script - זה חוסך סבב שלם של פריסה ובדיקה.
 */

const fs = require('fs');

function makeEnv(code, cfgPatch, eventPatch) {
  const MAILS = [];
  const SHEETS = {};

  const makeSheet = (name) => {
    const rows = [];
    const sh = {
      name, _rows: rows,
      getLastRow: () => rows.length + 1,
      appendRow: r => rows.push(r.slice()),
      deleteRow: idx => rows.splice(idx - 2, 1),
      getRange: (row, col, numRows, numCols) => ({
        getValues: () => {
          if (row === 1) return [[]];
          const out = [];
          for (let i = 0; i < numRows; i++) {
            const r = rows[row - 2 + i] || [];
            out.push(r.slice(col - 1, col - 1 + numCols));
          }
          return out;
        },
        setValues: () => {},
        setBackground: () => sh._fmt(), setFontColor: () => sh._fmt(),
        setFontWeight: () => sh._fmt(), setHorizontalAlignment: () => sh._fmt(),
        setVerticalAlignment: () => sh._fmt(), setDataValidation: () => {}
      }),
      _fmt() { return sh.getRange(1, 1, 1, 7); },
      setRightToLeft: () => {}, setFrozenRows: () => {}, setColumnWidth: () => {}
    };
    return sh;
  };

  const sandbox = {
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: n => SHEETS[n] || null,
        insertSheet: n => (SHEETS[n] = makeSheet(n))
      }),
      newDataValidation: () => ({ requireValueInList: () => ({ build: () => ({}) }) })
    },
    MailApp: { sendEmail: o => MAILS.push(o) },
    Utilities: { formatDate: () => '01/01/2027 10:00' },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: t => ({ setMimeType: () => JSON.parse(t) })
    },
    console: { error: () => {} }
  };

  const names = Object.keys(sandbox);
  const body = code +
    '\n;Object.assign(CFG, ' + JSON.stringify(cfgPatch || {}) + ');' +
    '\n;Object.assign(EVENT, ' + JSON.stringify(eventPatch || {}) + ');' +
    '\nreturn { doPost, checkWaitlist, activeCount, CFG, EVENT };';

  const api = new Function(...names, body)(...names.map(n => sandbox[n]));
  return { api, MAILS, SHEETS };
}

const CODE = fs.readFileSync(process.argv[2] || '../assets/Code.gs', 'utf8');

const reg = (api, i) => api.doPost({ parameter: {
  full_name: 'נרשמת ' + i,
  phone: '05011122' + String(i).padStart(2, '0'),
  email: 'r' + i + '@example.com',
  pregnancy_week: 'פרט נוסף'
}});

const checks = [];
const t = (name, ok, extra) => checks.push([name, !!ok, extra || '']);

/* ---------- תרחיש 1: תפוסה, רשימת המתנה, ביטול והעלאה ---------- */
{
  const { api, MAILS, SHEETS } = makeEnv(CODE,
    { capacity: 3, notify: 'mgr@example.com', replyTo: 'mgr@example.com' },
    { payLink: 'https://pay.example.com/abc', price: '350 ₪' });

  for (let i = 1; i <= 3; i++) reg(api, i);
  const r4 = reg(api, 4);
  const r5 = reg(api, 5);

  t('שלוש הראשונות נכנסו', SHEETS[api.CFG.mainName]._rows.length === 3);
  t('הרביעית לרשימת המתנה', r4.waitlist === true && r4.position === 1);
  t('החמישית מקום 2 בתור', r5.waitlist === true && r5.position === 2);
  t('גיליון ההמתנה נוצר לבד', !!SHEETS[api.CFG.waitName]);

  SHEETS[api.CFG.mainName]._rows[0][5] = 'בוטל';
  t('ביטול מפנה מקום', api.activeCount(SHEETS[api.CFG.mainName]) === 2);

  api.checkWaitlist();
  const main = SHEETS[api.CFG.mainName]._rows;
  const last = main[main.length - 1];
  t('הראשונה בתור עלתה', last[1] === 'נרשמת 4');
  t('סומנה הערת מקור', last[6] === 'עלתה מרשימת ההמתנה');
  t('נשארה אחת בהמתנה', SHEETS[api.CFG.waitName]._rows.length === 1);

  const to4 = MAILS.filter(m => m.to === 'r4@example.com');
  t('נרשמת ההמתנה קיבלה 2 מיילים', to4.length === 2);
  t('מייל ההמתנה בלי קישור תשלום', to4[0] && !to4[0].htmlBody.includes('pay.example.com'));
  t('מייל העלייה עם קישור תשלום', to4[1] && to4[1].htmlBody.includes('pay.example.com'));
  t('מייל רגיל עם קישור תשלום',
    MAILS.find(m => m.to === 'r1@example.com').htmlBody.includes('pay.example.com'));
  t('reply-to מכוון למנהלת',
    MAILS.find(m => m.to === 'r1@example.com').replyTo === 'mgr@example.com');
  t('המנהלת קיבלה התראה על כל הרשמה',
    MAILS.filter(m => m.to === 'mgr@example.com').length >= 5);
}

/* ---------- תרחיש 2: תפוסה ללא הגבלה ---------- */
{
  const { api, SHEETS } = makeEnv(CODE, { capacity: 0 }, {});
  let anyWait = false;
  for (let i = 1; i <= 40; i++) if (reg(api, i).waitlist) anyWait = true;
  t('capacity 0 = בלי הגבלה', !anyWait && SHEETS[api.CFG.mainName]._rows.length === 40);
}

/* ---------- תרחיש 3: שדות ריקים לא מופיעים במייל ---------- */
{
  const { api, MAILS } = makeEnv(CODE, { capacity: 0 },
    { payLink: '', parking: '', includes: '', bitPhone: '050-1234567', price: '200 ₪' });
  reg(api, 1);
  const body = MAILS.find(m => m.to === 'r1@example.com').htmlBody;
  t('בלי קישור תשלום מוצג המספר', body.includes('050-1234567'));
  t('חניה ריקה לא יוצרת שורה ריקה', !body.includes('<br><span style="color:#6b6456;font-size:14px"></span>'));
  t('פרטי האירוע מופיעים', body.includes('200 ₪'));
}

/* ---------- תרחיש 4: קלט פגום ---------- */
{
  const { api, SHEETS } = makeEnv(CODE, { capacity: 0 }, {});
  const bad = api.doPost({ parameter: { full_name: 'רק שם' } });
  t('שדות חסרים נדחים', bad.ok === false && bad.error === 'missing_fields');
  t('קלט פגום לא נרשם בגיליון', !SHEETS[api.CFG.mainName]);

  reg(api, 1);
  const phone = SHEETS[api.CFG.mainName]._rows[0][2];
  t('גרש לפני הטלפון שומר על ה-0', String(phone).charAt(0) === "'");
}

/* ---------- דוח ---------- */
let fails = 0;
for (const [name, ok, extra] of checks) {
  if (!ok) fails++;
  console.log((ok ? '  OK   ' : '  FAIL ') + name + (extra ? '  ' + extra : ''));
}
console.log('');
console.log(fails === 0
  ? 'ALL ' + checks.length + ' CHECKS PASSED'
  : fails + ' FAILURES out of ' + checks.length);
process.exit(fails ? 1 : 0);
