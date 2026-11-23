# צד הלקוח — חיבור הטופס

## הטופס

```html
<form id="registerForm" novalidate>
  <div class="form-group">
    <label for="fullname">שם מלא:</label>
    <input type="text" id="fullname" name="full_name" class="form-control"
           placeholder="שרה כהן" required>
  </div>

  <div class="form-group">
    <label for="phone">מספר טלפון:</label>
    <input type="tel" id="phone" name="phone" class="form-control"
           placeholder="050-0000000" dir="ltr" style="text-align: right;" required>
  </div>

  <div class="form-group">
    <label for="email">כתובת אימייל:</label>
    <input type="email" id="email" name="email" class="form-control"
           placeholder="name@example.com" dir="ltr" style="text-align: right;" required>
  </div>

  <button type="submit" class="btn-cta" id="submitBtn">שליחת פרטים</button>
</form>

<div class="form-status" id="formStatus" role="status" aria-live="polite"></div>
```

`novalidate` מכבה את בועות השגיאה של הדפדפן, שמופיעות באנגלית ולא ניתנות לעיצוב — הוולידציה שלנו בעברית מחליפה אותן. `dir="ltr"` על טלפון ואימייל מונע היפוך של מה שהמשתמשת מקלידה.

## הסקריפט

```js
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
const WA_NUMBER  = "972500000000";

const form      = document.getElementById("registerForm");
const statusEl  = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

const setStatus = (text, kind) => {
  statusEl.textContent = text;
  statusEl.className = "form-status" + (kind ? " is-" + kind : "");
};

/* טלפון ישראלי: נייד 10 ספרות שמתחיל ב-05, או קו נייח 9 ספרות */
const validPhone = v => /^0(5\d|[2-489])\d{7}$/.test(v.replace(/[\s\-()]/g, ""));
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const data = {
    full_name: form.full_name.value.trim(),
    phone:     form.phone.value.trim(),
    email:     form.email.value.trim()
  };

  if (data.full_name.length < 2) return setStatus("נא למלא שם פרטי ומשפחה", "error");
  if (!validPhone(data.phone))   return setStatus("מספר הטלפון לא נראה תקין — למשל 050-0000000", "error");
  if (!validEmail(data.email))   return setStatus("כתובת האימייל לא נראית תקינה", "error");

  submitBtn.disabled = true;
  submitBtn.textContent = "שולחת…";
  setStatus("שולחת את הפרטים…", "pending");

  try {
    /* URLSearchParams הופך את זה לבקשה "פשוטה" בלי preflight.
       עם JSON הדפדפן ישלח קודם OPTIONS, ו-Apps Script חוסם אותו. */
    const res = await fetch(SCRIPT_URL, { method: "POST", body: new URLSearchParams(data) });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "server_error");

    onRegistered(data, out);

  } catch (err) {
    /* רשת ביטחון: ההרשמה לא נעלמת בשקט */
    console.error("registration failed:", err);
    const msg = "היי, אני רוצה להירשם.\nשם: " + data.full_name +
                "\nטלפון: " + data.phone + "\nאימייל: " + data.email;
    statusEl.className = "form-status is-error";
    statusEl.innerHTML = "השליחה נכשלה — אבל הפרטים שלך לא אבדו. " +
      '<a href="https://wa.me/' + WA_NUMBER + "?text=" + encodeURIComponent(msg) +
      '" target="_blank" rel="noopener"><strong>לחצי כאן לשליחה בוואטסאפ</strong></a>';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "שליחת פרטים";
  }
});

function panel(title, lead, steps) {
  return '<div class="done-title">' + title + '</div>' +
         '<p class="done-lead">' + lead + '</p>' +
         '<ul class="done-steps"><li>' + steps.join('</li><li>') + '</li></ul>' +
         '<p class="done-spam">לא רואה את המייל? כדאי לבדוק בקידומי מכירות או בספאם.</p>';
}

function onRegistered(data, out) {
  const first = data.full_name.split(" ")[0];
  form.reset();
  statusEl.className = "form-status is-success";

  statusEl.innerHTML = (out && out.waitlist)
    ? panel("✓ הפרטים שלך התקבלו",
        first + ", האירוע מלא כרגע ואת <strong>מספר " + out.position + "</strong> ברשימת ההמתנה.",
        ["שלחנו לך מייל עם כל הפרטים",
         "<strong>אין צורך לשלם בשלב הזה</strong>",
         "אם יתפנה מקום נעדכן אותך במייל"])
    : panel("✓ הפרטים שלך התקבלו",
        first + ", שמחות שאת איתנו! <strong>ההרשמה עדיין לא הושלמה.</strong>",
        ["שלחנו לך עכשיו מייל עם כל הפרטים",
         "<strong>להשלמת ההרשמה יש ללחוץ על כפתור התשלום שבמייל</strong>",
         "המקום יישמר סופית רק לאחר התשלום"]);
}
```

## למה כל חלק שם

**`ev.preventDefault()` ו-`fetch`** — טופס רגיל עוזב את העמוד. כך המשתמשת נשארת, רואה אישור, ואפשר להמשיך לדבר איתה.

**`URLSearchParams` ולא JSON** — בקשה עם `Content-Type: application/json` היא "מורכבת" ומפעילה בקשת `OPTIONS` מקדימה, ש-Apps Script לא עונה לה. `URLSearchParams` נשלח כ-`application/x-www-form-urlencoded`, שנחשב "פשוט" ועובר ישירות.

**הודעה שאומרת שההרשמה לא הושלמה** — בלי המשפט הזה, "הפרטים התקבלו" מרגיש כמו סוף, והאישה סוגרת את הדף בלי לשלם. אמירה מפורשת שהיא באמצע התהליך היא מה שמביא אותה לפתוח את המייל.

**שורת הספאם** — מייל אוטומטי מחשבון גוגל נוחת לא פעם בלשונית "קידומי מכירות" של Gmail. בלי השורה הזו היא פשוט לא תמצא אותו.

**רשת הביטחון לוואטסאפ** — כל קריאה לרשת יכולה להיכשל. בלעדיה, אישה שמילאה טופס בזמן תקלה פשוט נעלמת, ואף אחד לא יודע שהיא ניסתה.

## עיצוב פאנל האישור

```css
.form-status { margin-top: 14px; font-size: .95rem; min-height: 1.2em; text-align: center; }
.form-status.is-error   { color: #b00020; }
.form-status.is-pending { color: #6b6456; }

.form-status.is-success {
  background: #eaf7f1;
  border: 1px solid #bfe3d3;
  border-radius: 16px;
  padding: 20px 18px;
  text-align: right;
}

.done-title { color: #0a7d52; font-weight: 800; font-size: 1.12rem;
              margin-bottom: 8px; text-align: center; }
.done-lead  { margin: 0 0 12px; font-size: .98rem; line-height: 1.6; }
.done-steps { margin: 0; padding-inline-start: 20px; font-size: .95rem; line-height: 1.65; }
.done-steps li::marker { color: #0a7d52; }
.done-spam  { margin: 12px 0 0; font-size: .84rem; color: #6b6456;
              border-top: 1px solid #cfe8dc; padding-top: 10px; }
```

## לפני שמוסרים

הריצי `node --check` על ה-JS שחולץ מהדף. שגיאת תחביר אחת משביתה את **כל** הסקריפטים בעמוד בשקט — הטופס פשוט לא יגיב, בלי שום הודעה.
