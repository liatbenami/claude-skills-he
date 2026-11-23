# מבנה הדף והרכיבים

## תוכן עניינים

1. [סדר הסקשנים](#סדר-הסקשנים)
2. [הדר דביק](#1-הדר-דביק)
3. [הירו](#2-הירו)
4. [אליפסות הפרטים](#3-אליפסות-הפרטים)
5. [לוח זמנים](#4-לוח-זמנים)
6. [כרטיסיות מנחות](#5-כרטיסיות-מנחות)
7. [הרשמה](#6-הרשמה)
8. [כפתור וואטסאפ צף](#7-כפתור-וואטסאפ-צף)

---

## סדר הסקשנים

```
הדר דביק        לוגו + שם האירוע
הירו             כותרת, משפט מסביר, תמונה, כפתור פעולה
אליפסות הפרטים   מתי · איפה · מחיר · מה כלול
לוח זמנים        מה קורה באירוע, שעה אחר שעה
מנחות            מי מעבירה, עם תמונה ורקע
הרשמה            טופס או כפתור וואטסאפ
פוטר             פרטי קשר
```

**הסדר הזה לא שרירותי:** הוא עונה על שאלות המבקרת בסדר שבו היא שואלת אותן. מה זה? מתי וכמה? מה אני מקבלת? מי מעבירה? איך נרשמים? מי שמקפיצה את ההרשמה למעלה מאבדת את מי שעוד לא השתכנעה.

**לדלג על מה שאין.** אירוע עם מנחה אחת לא צריך סקשן "מנחות" — שורה בהירו מספיקה. סקשן ריק גרוע מסקשן חסר.

---

## 1. הדר דביק

```html
<header>
  <div class="container header-inner">
    <img src="logo.svg" alt="שם העסק" class="header-logo">
    <div class="header-title">
      שם האירוע<span class="header-sep">·</span>תת-כותרת<span class="header-sep">·</span>קהל היעד
    </div>
  </div>
</header>
```

```css
header {
  background: var(--brand-cream);
  padding: 14px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 14px rgba(90, 102, 80, .07);
}

.header-inner { display: flex; align-items: center; min-height: 62px; }
.header-logo  { height: 56px; width: auto; }

.header-title {
  position: absolute; left: 0; right: 0;   /* ממורכז ללא תלות ברוחב הלוגו */
  text-align: center;
  font-family: 'Varela Round', sans-serif;
  font-size: 1.22rem;
  color: var(--brand-burgundy);
  pointer-events: none;
}

.header-sep { color: var(--brand-rose); padding: 0 10px; }

@media (max-width: 860px) {
  /* בשורה אחת גם בטלפון: לוגו מימין, כותרת ממלאת את השאר */
  .header-inner { gap: 6px; min-height: 46px; }
  .header-logo  { height: 32px; flex: 0 0 auto; }
  .header-title {
    position: static; flex: 1;
    white-space: nowrap;
    font-size: clamp(.58rem, 3.2vw, 1.22rem);
  }
  header .container { padding-left: 10px; padding-right: 10px; }
  .header-sep { padding: 0 2px; }
}
```

את מקדם ה-vw מודדים, לא מנחשים — ראי `rtl-gotchas.md` סעיף 3. וזכרי `scroll-margin-top` על הסקשנים.

---

## 2. הירו

```html
<section class="hero">
  <div class="container">
    <h1>שם האירוע</h1>
    <p class="hero-subtitle">משפט אחד שאומר למי זה ולמה</p>
    <p class="hero-desc">משפט שני עם ההבטחה או המיקום</p>
    <div class="hero-img-box"><img src="hero.jpg" alt="תיאור התמונה"></div>
    <a href="#register" class="btn-cta">🤍 אני רוצה לשריין מקום</a>
  </div>
</section>
```

```css
.hero { background: var(--brand-cream); padding: 50px 0 65px; text-align: center; }
.hero h1 { font-size: 3rem; color: var(--brand-burgundy); margin-bottom: 14px; }

.hero-subtitle {
  font-size: clamp(.78rem, 3.5vw, 1.4rem);
  font-weight: 600;
  color: var(--brand-plum);
  white-space: nowrap;          /* שלא יישבר לשתי שורות בטלפון */
  margin-bottom: 12px;
}

.hero-desc {
  font-size: clamp(.66rem, 2.95vw, 1.2rem);
  color: var(--text-muted);
  white-space: nowrap;
  max-width: 650px;
  margin: 0 auto 30px;
}

.hero-img-box img {
  width: 100%; height: 420px; object-fit: cover;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

@media (max-width: 768px) {
  .hero h1 { font-size: 2.2rem; }
  .hero-img-box img { height: 230px; }
  .hero .btn-cta { white-space: nowrap; font-size: clamp(.95rem, 4.6vw, 1.25rem); }
}
```

**על התמונה:** תמונה אמיתית מהסדנה עדיפה על סטוק. אם אין, בחרי סטוק שמראה את האווירה (אנשים, ידיים, מרחב) ולא קלישאה. `object-fit: cover` מונע מתיחה.

---

## 3. אליפסות הפרטים

הרכיב החזק בדף — ארבע עובדות בסריקה של שנייה.

```html
<div class="facts">
  <div class="fact"><div class="fact-oval">
    <div class="fact-value">22/12/2026</div>
  </div></div>

  <div class="fact"><div class="fact-oval">
    <div class="fact-value" dir="ltr">16:00 – 19:30</div>
  </div></div>

  <div class="fact"><div class="fact-oval">
    <div class="fact-value">מלון יולדות צפון</div>
    <div class="fact-sub">מיכל 1 חיפה</div>
  </div></div>

  <div class="fact"><div class="fact-oval">
    <div class="fact-value">350 ₪</div>
    <div class="fact-sub">כולל ערכה אישית</div>
  </div></div>
</div>
```

```css
.facts {
  display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start;
  gap: 14px 16px;
  padding: 26px 0 30px;          /* אוויר להיסט הזיגזג */
}

.fact { text-align: center; }

/* זיגזג: כל אליפסה שנייה יורדת, במקום שורה ישרה ומשעממת */
.fact:nth-child(even) { transform: translateY(30px); }

.fact-oval {
  width: 198px; height: 134px;
  border-radius: 50%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 10px 16px;
  color: #fff;
  background: radial-gradient(circle at 32% 24%, #8d9b7d 0%, #6d7b5e 100%);
  box-shadow: 0 16px 30px rgba(109,123,94,.30), inset 0 2px 0 rgba(255,255,255,.18);
}

.fact-value {
  font-size: 1.22rem; font-weight: 800; line-height: 1.26;
  text-shadow: 0 1px 3px rgba(0,0,0,.28);      /* מחדד טקסט לבן על רקע מגוון */
}

.fact-sub {
  font-size: .9rem; font-weight: 600; margin-top: 3px;
  color: rgba(255,255,255,.95);
  text-shadow: 0 1px 2px rgba(0,0,0,.22);
}

@media (max-width: 560px) {
  .facts { gap: 12px; padding: 20px 0 26px; }
  .fact-oval { width: min(156px, 43vw); height: min(112px, 31vw); padding: 8px 10px; }
  .fact-value { font-size: clamp(.84rem, 3.9vw, 1.02rem); }
  .fact-sub   { font-size: clamp(.66rem, 3vw, .8rem); }
  .fact:nth-child(even) { transform: translateY(22px); }
}
```

**אזהרת רוחב:** ארבע אליפסות חייבות להיכנס בשורה אחת בדסקטופ. החשבון: `(רוחב_המכולה − סך_הרווחים) ÷ 4`. במכולה של 912px עם רווחים של 16px יוצא 216px מקסימום. הגדלה מעבר לזה דוחפת את הרביעית לשורה שנייה — ושוברת את הזיגזג.

**טקסט לבן על רקע ירוק:** `text-shadow` הוא מה שמפריד את האותיות מהגרדיאנט. בלעדיו הטקסט נבלע.

---

## 4. לוח זמנים

```html
<div class="schedule-container">
  <div class="sched-row">
    <div class="sched-time">16:00</div>
    <div class="sched-text">
      <span class="sched-title">נחיתה רכה</span>
      <span class="sched-dot">•</span>התכנסות, תה וקפה, פתיחה והיכרות
    </div>
  </div>

  <div class="sched-row">
    <div class="sched-time">16:30</div>
    <div class="sched-text">
      <span class="sched-title">שיחה בגובה העיניים</span>
      <span class="sched-with">עם <em class="sched-host">רונית לוי</em></span>
      <span class="sched-dot">•</span>הכנה מעשית ללידה
    </div>
  </div>
</div>
```

```css
.sched-row {
  display: flex; align-items: baseline; gap: 22px;
  padding: 15px 10px;
  border-bottom: 1px solid rgba(116,128,104,.22);
}
.sched-row:nth-child(even) { background: rgba(116,128,104,.045); }

.sched-time {
  flex: 0 0 68px;
  font-size: 1.14rem; font-weight: 700;
  color: var(--brand-plum);
  font-variant-numeric: tabular-nums;    /* ספרות ברוחב אחיד - הטור מיושר */
}

.sched-text  { font-size: 1.09rem; color: var(--text-muted); line-height: 1.6; }
.sched-title { font-weight: 700; color: var(--brand-burgundy); font-size: 1.12rem; }
.sched-dot   { color: var(--brand-rose); padding: 0 3px; }

/* שם המנחה בשורה משלו, עם מילת הקישור */
.sched-with {
  display: block;
  font-size: .97rem; color: var(--text-muted);
  margin: 1px 0 3px;
}
.sched-host { font-style: italic; font-weight: 700; color: var(--brand-plum); }

@media (max-width: 560px) {
  .sched-row { gap: 14px; padding: 13px 4px; }
  .sched-time { flex-basis: 54px; font-size: 1.02rem; }
}
```

**שם המנחה בשורה נפרדת** — ועם מילת הקישור ("עם", "בהנחיית"). אם משאירים את המילה למעלה, הכותרת מסתיימת ב"שיחה בגובה העיניים עם" והעין נתקעת במילה תלויה.

---

## 5. כרטיסיות מנחות

```html
<div class="hosts-grid">
  <div class="host-card">
    <div>
      <img src="host.jpg" alt="שם" class="host-avatar">
      <h3 class="host-name">שם המנחה</h3>
      <div class="host-role">התפקיד בשורה אחת</div>
      <p class="host-bio">שתי שורות על הרקע והניסיון</p>
    </div>
    <div class="host-tech"><strong>התמחות:</strong> תחומים ספציפיים</div>
  </div>
</div>
```

```css
.hosts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.host-card {
  background: #fff; border-radius: var(--radius-lg);
  padding: 32px 24px; text-align: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(116,128,104,.12);
  display: flex; flex-direction: column; justify-content: space-between;
}

.host-avatar {
  width: 130px; height: 130px;
  border-radius: 50%; object-fit: cover;
  border: 4px solid var(--brand-blush);
  margin-bottom: 14px;
}

.host-name { color: var(--brand-burgundy); font-size: 1.3rem; }
.host-role { color: var(--brand-plum); font-weight: 600; margin-bottom: 10px; }
.host-bio  { color: var(--text-muted); font-size: .98rem; }
.host-tech {
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid var(--brand-blush);
  font-size: .9rem; color: var(--text-muted);
}
```

`auto-fit` עם `minmax` מסדר את הכרטיסיות לבד — שלוש בדסקטופ, אחת בטלפון, בלי media query.

**אם יש לוגו אישי למנחה** — בדקי שאין מתחתיו כיתוב חתוך או מיותר. חיתוך התמונה עדיף על הצגת לוגו שבור.

---

## 6. הרשמה

ברירת המחדל, בלי שום הקמה — כפתור וואטסאפ עם הודעה מוכנה:

```html
<a class="btn-cta" target="_blank" rel="noopener"
   href="https://wa.me/972XXXXXXXXX?text=היי%2C%20אשמח%20לפרטים%20על%20הסדנה">
  לשריון מקום בוואטסאפ
</a>
```

המספר בפורמט בינלאומי בלי `+` ובלי `0` מוביל: `050-1234567` הופך ל-`972501234567`. הטקסט מקודד ב-`encodeURIComponent`.

**אם היא רוצה טופס אמיתי** — שים לב שדף סטטי לא יכול לשמור נתונים בעצמו. חייב שירות חיצוני, וכולם דורשים ממנה פתיחת חשבון. אמרי לה את זה בפירוש לפני שמתחילים. ראי `SKILL.md` → "מה הסקיל הזה לא עושה".

CSS לשדות טופס, אם יש:

```css
.form-control {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #c3cbb6;
  font-family: inherit; font-size: 1rem;
  background: #fdfaf4;
}
.form-control:focus {
  border-color: var(--brand-burgundy);
  box-shadow: 0 0 0 4px rgba(122,18,77,.1);
  outline: none;
}

@media (max-width: 768px) {
  .form-control, .form-control::placeholder { font-size: 16px; padding: 13px 14px; }
}
```

ה-16px בנייד הוא חובה — ראי `rtl-gotchas.md` סעיף 5.

---

## 7. כפתור וואטסאפ צף

```html
<a class="floating-wa" target="_blank" rel="noopener" title="דברי איתי בוואטסאפ"
   href="https://wa.me/972XXXXXXXXX?text=היי%2C%20אשמח%20לפרטים">💬</a>
```

```css
.floating-wa {
  position: fixed; bottom: 22px; left: 22px;   /* שמאל ב-RTL = הצד הפנוי */
  width: 58px; height: 58px;
  background: #25D366; color: #fff;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.7rem; text-decoration: none;
  box-shadow: 0 6px 18px rgba(0,0,0,.2);
  z-index: 99;
  transition: transform .25s;
}
.floating-wa:hover { transform: scale(1.08); }
```

**לבדוק שהוא לא מכסה תוכן** בתחתית העמוד בנייד — במיוחד כפתורים בסוף טופס.
