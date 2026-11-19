# מסמכי הפרויקט

כל מסמך נכתב כקובץ Markdown כאן, ונבנה לדף HTML בעיצוב האחיד.

- בנייה: `npm install` (פעם אחת), ואז `node build.mjs`. הפלט נוצר ב-`dist/`.
- תבנית: `template/page.html` + `template/style.css`. לא משנים עיצוב למסמך בודד.
- בראש כל מסמך: front matter עם title, kind, version, date, status, lead.
- תוספות תחביר: `> [!החלטה]`, `> [!לאמת]`, `> [!הערה]`, `> [!לגרסה שלנו]` בתחילת ציטוט, ו-`[[לאמת]]` בתוך שורה.

## מסמכים
- `belts.md` — מפרט הפקת 30 חגורות האליפות.
- `costs.md` — תקציב ועלויות. דף מפורסם: https://claude.ai/artifact/6D7rw6N4kdwPzpT2TdqyKn
- `gdd.md` — מסמך אפיון המשחק. דף מפורסם: https://claude.ai/artifact/RcepWhLbcV9pjfxgP5tCHc (לעדכן אותו: לפרסם מחדש את `dist/gdd.html` לאותה כתובת).
