#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בדיקת נקודת הקצה החיה של Apps Script.

    python test_endpoint.py https://script.google.com/macros/s/XXXX/exec

שולחת UTF-8 תקין, כדי שעברית שמגיעה שבורה תצביע על השרת ולא על הכלי.
שימוש ב-curl כאן מועד לשתי תקלות שלא קשורות לשרת: ווינדוס שמקלקל את
העברית, ו-`-L -X POST` שמחזיר 411. urllib נקי משתיהן.

--capacity N  בודקת גם שהתפוסה היא לפחות N, על ידי N הרשמות ברצף.
              זהירות: זה כותב שורות אמיתיות בגיליון ושולח מיילים אמיתיים.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT = 45


def post(url, fields):
    """שולחת בקשה ומחזירה (קוד HTTP, גוף התשובה, JSON או None)."""
    body = urllib.parse.urlencode(fields, encoding='utf-8').encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            raw = r.read().decode('utf-8', 'replace')
            code = r.getcode()
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'replace')
        code = e.code
    except Exception as e:
        return 0, str(e), None

    try:
        return code, raw, json.loads(raw)
    except ValueError:
        return code, raw, None


def explain(code, raw, data):
    """מתרגמת תשובה גולמית להסבר בעברית."""
    if code == 401 or 'לא ניתן לפתוח את הקובץ' in raw or 'accounts.google.com' in raw:
        return ('כשל', 'HTTP %s - ההרשאה אינה "כל אחד".\n'
                       '         פריסה > ניהול פריסות > עריכה > למי יש גישה: כל אחד' % code)
    if code == 404:
        return ('כשל', 'HTTP 404 - הכתובת שגויה או שהפריסה נמחקה. '
                       'לוודא שהיא נגמרת ב-/exec')
    if code == 411:
        return ('כשל', 'HTTP 411 - תקלה בכלי השליחה, לא בשרת')
    if code == 0:
        return ('כשל', 'לא הצלחתי להגיע לשרת: ' + raw[:160])
    if data is None:
        return ('כשל', 'HTTP %s - חזר HTML במקום JSON. '
                       'כנראה מסך התחברות, כלומר בעיית הרשאות' % code)
    return (None, None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url')
    ap.add_argument('--capacity', type=int, default=0,
                    help='לבדוק שהתפוסה לפחות N (כותב שורות אמיתיות!)')
    args = ap.parse_args()

    if not args.url.rstrip('/').endswith('/exec'):
        print('שים לב: הכתובת לא נגמרת ב-/exec. כתובת /dev היא כתובת בדיקה בלבד.\n')

    fails = 0

    # --- 1. שדות חסרים ---
    print('1. שדות חסרים (אמור להידחות)')
    code, raw, data = post(args.url, {'full_name': 'רק שם'})
    status, msg = explain(code, raw, data)
    if status:
        print('   [כשל ] ' + msg); fails += 1
    elif data.get('ok') is False and data.get('error') == 'missing_fields':
        print('   [OK  ] נדחה כראוי: missing_fields')
    else:
        print('   [כשל ] ציפיתי ל-missing_fields, קיבלתי: ' + json.dumps(data, ensure_ascii=False))
        fails += 1

    # --- 2. הרשמה תקינה עם עברית ---
    print('\n2. הרשמה תקינה, עם עברית ב-UTF-8')
    code, raw, data = post(args.url, {
        'full_name': 'בדיקה אוטומטית - נא למחוק',
        'phone': '0501112233',
        'email': 'endpoint-test@example.com',
        'pregnancy_week': 'בדיקת עברית'
    })
    status, msg = explain(code, raw, data)
    if status:
        print('   [כשל ] ' + msg); fails += 1
    elif data.get('ok'):
        print('   [OK  ] נקלטה: ' + json.dumps(data, ensure_ascii=False))
        if 'waitlist' in data:
            print('   [OK  ] שדה waitlist קיים - הגרסה עם רשימת המתנה פרוסה')
        else:
            print('   [שים לב] אין שדה waitlist בתשובה.')
            print('          אם הקוד שלך אמור להחזיר אותו, הפריסה לא התעדכנה:')
            print('          פריסה > ניהול פריסות > עריכה > גרסה: גרסה חדשה')
        print('\n   >>> לפתוח את הגיליון ולוודא שהעברית נכנסה תקינה ולא כ-?????')
        print('   >>> ולמחוק את שורת "בדיקה אוטומטית - נא למחוק"')
    else:
        print('   [כשל ] ' + json.dumps(data, ensure_ascii=False)); fails += 1

    # --- 3. תפוסה ---
    if args.capacity:
        print('\n3. תפוסה: שולחת %d הרשמות ברצף' % args.capacity)
        print('   (כותב שורות אמיתיות ושולח מיילים - למחוק אחר כך)')
        waitlisted = 0
        for i in range(1, args.capacity + 1):
            _, _, d = post(args.url, {
                'full_name': 'בדיקת תפוסה %d - למחוק' % i,
                'phone': '05099988%02d' % i,
                'email': 'cap-test-%d@example.com' % i
            })
            flag = (d or {}).get('waitlist')
            print('   הרשמה %-2d -> %s' % (i, json.dumps(d, ensure_ascii=False)))
            if flag:
                waitlisted += 1
        if waitlisted:
            print('   [שים לב] %d מתוך %d נכנסו לרשימת המתנה.' % (waitlisted, args.capacity))
            print('          התפוסה בפועל קטנה ממה שציפית, או שהגיליון כבר מלא')
        else:
            print('   [OK  ] אף אחת לא נכנסה להמתנה - התפוסה לפחות %d' % args.capacity)

    print('\n' + ('הכל תקין' if not fails else '%d כשלים' % fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
