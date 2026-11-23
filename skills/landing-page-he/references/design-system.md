# מערכת העיצוב

נקודת פתיחה, לא חוק. המבנה והטיפוגרפיה שורדים בין פרויקטים; הצבעים צריכים להתחלף לפי המותג.

## תוכן עניינים

1. [דגימת צבע מלוגו](#דגימת-צבע-מלוגו)
2. [פלטת צבעים](#פלטת-צבעים)
3. [גופנים](#גופנים)
4. [מרווחים ופינות](#מרווחים-ופינות)
5. [שלד ה-CSS](#שלד-ה-css)

---

## דגימת צבע מלוגו

זה מה שמבדיל דף שמרגיש שייך למותג מדף שמרגיש תבנית. אם יש לוגו — דגמי ממנו לפני שאת בוחרת צבעים.

```python
from PIL import Image
from collections import Counter

im = Image.open('logo.jpg').convert('RGB')
W, H = im.size

# אזור הכיתוב בלוגו (התאימי את היחסים למה שרואים בתמונה)
txt = im.crop((int(W*.08), int(H*.77), int(W*.92), int(H*.92)))
px = list(txt.get_flattened_data())

# רק פיקסלים של הדיו: כהים ורוויים, בלי הרקע ובלי קצוות מטושטשים
core = [p for p in px if p[0] < 160 and abs(p[0]-p[1]) > 40]

# 20% הכהים ביותר - קרוב למה שהעין מזהה כצבע הלוגו
dark = sorted(core, key=sum)[:len(core)//5]
print('#%02X%02X%02X' % tuple(sum(c[i] for c in dark)//len(dark) for i in range(3)))
```

**למה 20% הכהים ולא הממוצע:** כיתוב מצולם מעורבב עם הרקע בכל פיקסל. הממוצע תמיד יוצא בהיר ודהוי יותר מהצבע האמיתי.

**לבדוק ניגודיות אחרי הדגימה.** צבע יפה שלא קריא הוא כישלון. נוסחת WCAG, היעד הוא 4.5 ומעלה לטקסט רגיל:

```python
def lum(rgb):
    f = lambda v: (v/255)/12.92 if v/255 <= .03928 else (((v/255)+.055)/1.055)**2.4
    r, g, b = map(f, rgb)
    return .2126*r + .7152*g + .0722*b

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return round((max(la,lb)+.05) / (min(la,lb)+.05), 2)
```

**הראי לה מספר אפשרויות.** אל תחליטי לבד — בני עמוד HTML קטן שמציג כל גוון ככותרת, ככפתור וכטקסט מודגש על רקע הדף, ופתחי לה אותו בדפדפן. צבע על מסך נראה אחרת לגמרי מקוד הקס ברשימה.

---

## פלטת צבעים

הפלטה מהפרויקט המקורי — רכה, טבעית, מתאימה לתחום הלידה והטיפול:

```css
:root {
  --brand-burgundy:  #7A124D;   /* ראשי - כותרות וכפתורים */
  --brand-plum:      #5c6752;   /* ירוק כהה - טקסט משני */
  --brand-rose:      #748068;   /* ירוק מרווה - מילויים ומפרידים */
  --brand-sage-deep: #5a6650;   /* ירוק מלא - משטחים עם טקסט לבן */
  --brand-blush:     #e8ece1;   /* רקע ירקרק רך */
  --brand-cream:     #f7ecda;   /* שמנת - רקע הדף */
  --brand-white:     #ffffff;
  --text-dark:       #2e2a24;
  --text-muted:      #6b6456;

  --shadow-sm: 0 4px 15px rgba(122, 18, 77, 0.05);
  --shadow-md: 0 10px 30px rgba(122, 18, 77, 0.08);
  --radius-lg: 24px;
  --radius-md: 16px;
}
```

**המבנה חשוב מהגוונים.** גם כשמחליפים פלטה, שומרים על אותם תפקידים: רקע חם ובהיר לדף, לבן לכרטיסיות, צבע ראשי אחד לכל הפעולות, ושני גוונים של טקסט (כהה לעיקר, עמום למשני).

**הצללים נגזרים מהצבע הראשי**, לא שחורים. `rgba(122,18,77,.05)` נותן צל חמים ששייך לפלטה; `rgba(0,0,0,.05)` נותן צל מלוכלך.

### פלטות לתחומים אחרים

| תחום | רקע | ראשי | משני |
|---|---|---|---|
| לידה, טיפול, יוגה | `#f7ecda` שמנת | `#7A124D` בורדו | `#5c6752` ירוק מרווה |
| בישול, אוכל | `#fdf6ec` | `#9c4221` חרס | `#6b705c` זית |
| עסקים, קריירה | `#f5f6f8` | `#1e3a5f` כחול עמוק | `#5a6b7d` |
| יצירה, אמנות | `#fdf4f5` | `#6b3fa0` סגול | `#8a7f9e` |

---

## גופנים

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&family=Varela+Round&display=swap" rel="stylesheet">
```

```css
body { font-family: 'Assistant', sans-serif; }
h1, .brand { font-family: 'Varela Round', 'Assistant', sans-serif; }
```

**Assistant** הוא גופן עברי מצוין לטקסט — קריא, נקי, בעל מגוון משקלים. **Varela Round** עגול וחם, מצוין לכותרת הראשית ולשם המותג, אבל מעייף בפסקאות.

שני הגופנים חינמיים ב-Google Fonts ותומכים מלא בעברית. אל תסתמכי על גופן שתומך רק באנגלית — העברית תיפול לברירת מחדל מכוערת של המערכת.

**היררכיה:** כותרת ראשית `3rem`, כותרת סקשן `2.1rem`, כותרת משנה `1.4rem`, גוף `1.05rem`, הערות `.88rem`. בנייד הכל יורד דרך `clamp` — ראי `rtl-gotchas.md` סעיף 3.

---

## מרווחים ופינות

- **פינות נדיבות.** `--radius-lg: 24px` לכרטיסיות, `50px` לכפתורים (כמוסה מלאה). פינות חדות מרגישות קשוחות ולא מתאימות לתחום הרך.
- **אוויר בין סקשנים:** `padding: 60px 0` בדסקטופ, `40px 0` בנייד.
- **רוחב מקסימלי לתוכן:** `960px`. טקסט ברוחב מסך מלא קשה לקריאה.
- **ריפוד צדדי בנייד:** 16px לפחות. טקסט שנוגע בשולי המסך נראה זול.

---

## שלד ה-CSS

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Assistant', sans-serif;
  background: var(--brand-cream);
  color: var(--text-dark);
  line-height: 1.7;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.section { padding: 60px 0; }

.section-title {
  font-size: 2.1rem;
  color: var(--brand-burgundy);
  text-align: center;
  margin-bottom: 10px;
}

/* כפתור הפעולה - אותו עיצוב בכל מקום בדף */
.btn-cta {
  display: inline-block;
  background: var(--brand-burgundy);
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  padding: 16px 38px;
  border-radius: 50px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(122, 18, 77, .25);
  transition: transform .25s, box-shadow .25s;
}

.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(122, 18, 77, .35);
}

/* עוגנים שלא נבלעים מתחת להדר הדביק */
section[id] { scroll-margin-top: 140px; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}

@media (max-width: 768px) {
  .section { padding: 40px 0; }
  .section-title { font-size: 1.6rem; }
  .container { padding: 0 16px; }
}
```
