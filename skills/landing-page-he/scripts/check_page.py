#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בדיקה סטטית של דף נחיתה בעברית.

תופסת את המלכודות החוזרות מ-references/rtl-gotchas.md בלי להריץ דפדפן,
כך שאפשר להריץ אותה אחרי כל שינוי ולא רק בסוף.

    python check_page.py index.html

יוצאת עם קוד 1 אם יש כשל, כדי שאפשר יהיה לשרשר אותה לתהליך אוטומטי.
בדיקות שדורשות פריסה אמיתית (גלישה אופקית, גובה שדות בפועל) לא נמצאות
כאן - להן צריך דפדפן. ראי rtl-gotchas.md סעיף 8.
"""

import io
import re
import sys

OK, WARN, FAIL = 'OK  ', 'שים לב', 'כשל '


def check(html):
    """מחזירה רשימת (סטטוס, כותרת, פירוט)."""
    out = []
    head = html[:2000]

    # --- יסודות ---
    if re.search(r'<html[^>]*\blang=["\']he["\']', html) and \
       re.search(r'<html[^>]*\bdir=["\']rtl["\']', html):
        out.append((OK, 'lang="he" dir="rtl"', 'הדף מוגדר כעברי מימין לשמאל'))
    else:
        out.append((FAIL, 'lang="he" dir="rtl"',
                    'חסר באלמנט <html>. בלי זה הכל מיושר שמאלה'))

    if 'name="viewport"' in head:
        out.append((OK, 'תג viewport', 'הדף יתאים את עצמו לרוחב המסך'))
    else:
        out.append((FAIL, 'תג viewport',
                    'חסר <meta name="viewport">. בטלפון הדף ייראה כמו דסקטופ מוקטן'))

    # --- קובץ עצמאי ---
    ext_css = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>', html)
    bad_css = [t for t in ext_css if 'fonts.googleapis' not in t and 'fonts.gstatic' not in t]
    ext_js = [t for t in re.findall(r'<script[^>]+src=[^>]+>', html)]
    if bad_css or ext_js:
        out.append((WARN, 'קובץ עצמאי',
                    'יש הפניות לקבצים חיצוניים (%d CSS, %d JS). הדף לא יעבוד '
                    'כשישלחו אותו לבד' % (len(bad_css), len(ext_js))))
    else:
        out.append((OK, 'קובץ עצמאי', 'הכל בתוך הקובץ, חוץ מגופני גוגל'))

    # --- מלכודת 1: היפוך מספרים ---
    # מחפשות טווחים של שני מספרים סביב מקף, בתוך טקסט של אלמנט
    text_only = re.sub(r'<(script|style)\b.*?</\1>', '', html, flags=re.S | re.I)
    ranges = []
    for m in re.finditer(r'>([^<>]*?\d{1,4}[:./]?\d{0,4}\s*[-–—]\s*\d{1,4}[:./]?\d{0,4}[^<>]*?)<',
                         text_only):
        snippet = m.group(1).strip()
        if not snippet:
            continue
        # האם לאלמנט שעוטף אותו יש dir="ltr"?
        before = text_only[max(0, m.start() - 260):m.start() + 1]
        tag = re.findall(r'<[a-zA-Z][^<>]*$', before)
        protected = bool(tag and 'dir="ltr"' in tag[-1]) or 'dir="ltr"' in before[-120:]
        ranges.append((snippet, protected))

    unprotected = [s for s, p in ranges if not p]
    if not ranges:
        out.append((OK, 'טווחי מספרים', 'לא נמצאו טווחים שעלולים להתהפך'))
    elif unprotected:
        out.append((FAIL, 'טווחי מספרים בלי dir="ltr"',
                    'יתהפכו על המסך: ' + ' | '.join(unprotected[:4])))
    else:
        out.append((OK, 'טווחי מספרים',
                    '%d טווחים, כולם מבודדים ב-dir="ltr"' % len(ranges)))

    # שדות טלפון ואימייל
    for kind, pat in (('tel', r'<input[^>]+type=["\']tel["\'][^>]*>'),
                      ('email', r'<input[^>]+type=["\']email["\'][^>]*>')):
        tags = re.findall(pat, html)
        bad = [t for t in tags if 'dir="ltr"' not in t]
        if tags and bad:
            out.append((WARN, 'שדה %s בלי dir="ltr"' % kind,
                        '%d שדות. הטקסט שהמשתמשת מקלידה עלול להתהפך' % len(bad)))
        elif tags:
            out.append((OK, 'שדות %s' % kind, 'מבודדים ב-dir="ltr"'))

    # --- מלכודת 2: עוגנים מתחת להדר דביק ---
    sticky = 'position: sticky' in html or 'position:sticky' in html
    anchors = re.findall(r'<section[^>]+id=', html)
    if sticky and anchors:
        if 'scroll-margin-top' in html:
            out.append((OK, 'עוגנים מתחת להדר דביק', 'יש scroll-margin-top'))
        else:
            out.append((FAIL, 'עוגנים מתחת להדר דביק',
                        'יש הדר דביק ו-%d סקשנים עם id, אבל אין scroll-margin-top. '
                        'קפיצה לעוגן תסתיר את ראש הסקשן' % len(anchors)))

    # --- מלכודת 5: זום של iOS ---
    mobile_blocks = re.findall(r'@media[^{]*max-width[^{]*\{(.*?)\n    \}',
                               html, flags=re.S)
    mobile_css = '\n'.join(mobile_blocks)
    if re.search(r'<input|<textarea|<select', html):
        if re.search(r'font-size:\s*16px', mobile_css):
            out.append((OK, 'זום של iOS', 'שדות הקלט נעולים על 16px בנייד'))
        else:
            out.append((WARN, 'זום של iOS',
                        'יש טופס, אבל לא נמצא font-size:16px בתוך media query. '
                        'ספארי יזים את העמוד בכניסה לשדה'))

    # --- מלכודת 7: כשל שקט בהעתקה ---
    if 'navigator.clipboard' in html:
        if '.catch(' in html and 'isSecureContext' in html:
            out.append((OK, 'העתקה ללוח', 'יש בדיקת הקשר מאובטח וגם catch'))
        else:
            out.append((WARN, 'העתקה ללוח',
                        'navigator.clipboard בלי isSecureContext או בלי catch. '
                        'ייכשל בשקט ב-file://'))

    # --- התאמה לנייד ---
    n_media = len(re.findall(r'@media[^{]*max-width', html))
    if n_media >= 2:
        out.append((OK, 'התאמה לנייד', '%d נקודות שבירה' % n_media))
    elif n_media == 1:
        out.append((WARN, 'התאמה לנייד', 'נקודת שבירה אחת בלבד'))
    else:
        out.append((FAIL, 'התאמה לנייד', 'אין אף media query'))

    if 'prefers-reduced-motion' in html:
        out.append((OK, 'נגישות תנועה', 'יש כיבוד ל-prefers-reduced-motion'))

    # --- תמונות בלי alt ---
    imgs = re.findall(r'<img[^>]*>', html)
    no_alt = [t for t in imgs if not re.search(r'\balt=', t)]
    if imgs:
        if no_alt:
            out.append((WARN, 'טקסט חלופי לתמונות',
                        '%d מתוך %d תמונות בלי alt' % (len(no_alt), len(imgs))))
        else:
            out.append((OK, 'טקסט חלופי לתמונות', 'לכל %d התמונות יש alt' % len(imgs)))

    # --- קישורי וואטסאפ ---
    for link in re.findall(r'wa\.me/(\d+)', html):
        if link.startswith('972') and not link.startswith('9720'):
            out.append((OK, 'מספר וואטסאפ', link + ' בפורמט בינלאומי תקין'))
        else:
            out.append((FAIL, 'מספר וואטסאפ',
                        link + ' - צריך להתחיל ב-972 בלי 0 אחריו'))

    # --- ממלאי מקום שנשכחו ---
    # לא כוללות PLACEHOLDER: גם placeholder= וגם ::placeholder הם CSS/HTML תקין
    left = re.findall(r'(XXX+|להשלים|TODO|FIXME|lorem ipsum)', html, flags=re.I)
    if left:
        out.append((WARN, 'ממלאי מקום',
                    'נשארו בדף: ' + ', '.join(sorted(set(left))[:5])))

    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    html = io.open(sys.argv[1], encoding='utf-8').read()
    results = check(html)

    print('בדיקת דף: %s\n' % sys.argv[1])
    for status, title, detail in results:
        print('  [%s] %s' % (status, title))
        print('         %s' % detail)

    fails = sum(1 for s, _, _ in results if s == FAIL)
    warns = sum(1 for s, _, _ in results if s == WARN)
    print('\n%d כשלים, %d הערות, %d תקינים'
          % (fails, warns, len(results) - fails - warns))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
