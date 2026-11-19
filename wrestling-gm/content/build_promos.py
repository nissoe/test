"""בונה את קטלוג הפרומואים של LWF (החלטה 52): ששת הפרומואים של המקור במחירים שלו, ועוד פרומואים משלנו.
פלט: content/promos.json, docs/promos.md
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# שם, בעברית, מקור, מחיר ($), משתתפים, תיאור בעברית, תיאור באנגלית, הערה
PROMOS = [
    # ---- כמו במקור (מחירים מאומתים מהמדריכים של 2K26) ----
    ('Self-Promo', 'פרומו עצמי', 'original', 2500, '1', 'משנה פופולריות לפי המיקרופון: 4–5 כוכבים מעלים, 1–2 עלולים להוריד.', 'Changes popularity based on mic skill: 4–5 stars raise it, 1–2 may lower it.', ''),
    ('Call-Out', 'קריאת תיגר', 'original', 3000, '2', 'פותח או מקדם יריבות בין שני מתאבקים.', 'Starts or advances a one-on-one rivalry.', ''),
    ('Tag Team Call-Out', 'קריאת תיגר לזוגות', 'original', 3000, '2×2', 'פותח או מקדם יריבות בין שני צמדים.', 'Starts or advances a tag team rivalry.', ''),
    ('Training', 'אימון', 'original', 5000, '1', 'מעלה את נקודות הניסיון של המתאבק.', 'Raises the superstar\'s ring XP.', ''),
    ('Charity', 'צדקה', 'original', 10000, '1', 'מביא מעט מעריצים נוספים השבוע, ואולי גם פופולריות.', 'Brings a small fan bonus this week, and maybe popularity.', 'חלק מהאתגרים העונתיים'),
    ('Advertising', 'פרסומת', 'original', 0, '1', 'בחינם, אבל מסוכן: פרומו חלש מוריד פופולריות.', 'Free, but risky: a weak promo costs popularity.', ''),
    ('Role Change', 'החלפת צד', 'original', 10000, '1', 'מתאבק עובר מטוב לרע או להפך, מול הקהל.', 'A superstar turns face or heel in front of the crowd.', ''),
    ('Class Change', 'החלפת סגנון', 'original', 10000, '1', 'מתאבק עובר לסגנון אחר (למשל מלוחם למכתש), וזה משנה את ההתאמות שלו בקרבות.', 'A superstar switches class (for example Fighter to Bruiser), which changes their matchups.', ''),
    ('Invasion', 'פלישה', 'original', 4000, '1', 'מתאבק תוקף תוכנית יריבה. פרומו טוב גונב ממנה מעריצים, ופרומו חלש מאבד מעריצים.', 'A superstar invades a rival show. A good promo steals fans, a weak one loses fans.', 'רק במרובה משתתפים, כמו במקור [[לאמת]]: מחיר'),
    # ---- משלנו ----
    ('Mentor Talk', 'שיחה עם מנטור', 'ours', 4000, '2', 'ותיק עם מיקרופון טוב מדבר עם צעיר: הצעיר מקבל ניסיון, ומגמת השיפור שלו במיקרופון מתקדמת.', 'A veteran with a good mic talks with a Prospect: the Prospect gains XP and their mic growth advances.', ''),
    ('Contract Signing', 'חתימת חוזה בזירה', 'ours', 7000, '2', 'שני המתמודדים על קרב באירוע השיא חותמים מול הקהל: היריבות עולה ברמה, ויש סיכוי להתקפה ופציעה.', 'Two opponents for a premium event sign in the ring: the rivalry goes up a level, with a chance of a brawl and injury.', 'רק בשבוע שלפני אירוע שיא'),
    ('Champion\'s Address', 'נאום האלוף', 'ours', 3500, '1', 'אלוף מדבר על התואר: פופולריות לפי המיקרופון, ובונוס לקרב התואר הבא שלו.', 'A champion talks about the title: popularity by mic skill, and a bonus to their next title match.', 'רק למחזיק תואר'),
    ('Open Challenge', 'אתגר פתוח', 'ours', 2000, '1', 'מתאבק קורא לכל מי שרוצה. אם צעיר או כישרון מקומי עונה וזוכה לקרב טוב, הוא מקבל פופולריות.', 'A superstar challenges anyone. If a Prospect or local talent answers and has a good match, they gain popularity.', ''),
    ('Backstage Segment', 'קטע מאחורי הקלעים', 'ours', 1500, '1–3', 'קטע קצר ומצולם: זול, השפעה קטנה על פופולריות ויריבות, ולא שוחק סיבולת.', 'A short filmed segment: cheap, a small effect on popularity and rivalries, and no stamina cost.', ''),
]

promos = [{'name': p[0], 'nameHe': p[1], 'origin': p[2], 'cost': p[3], 'participants': p[4], 'desc': p[5], 'descEn': p[6], 'note': p[7]} for p in PROMOS]
json.dump(promos, open(os.path.join(HERE, 'promos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def table(rows):
    t = ['| פרומו | מחיר | משתתפים | מה הוא עושה | הערה |', '| --- | --- | --- | --- | --- |']
    for p in rows:
        cost = 'חינם' if p[3] == 0 else f'${p[3]:,}'
        t.append(f"| {p[1]} ({p[0]}) | {cost} | {p[4]} | {p[5]} | {p[7]} |")
    return '\n'.join(t)


orig = [p for p in PROMOS if p[2] == 'original']
ours = [p for p in PROMOS if p[2] == 'ours']
doc = f'''---
title: סוגי הפרומואים
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: המחירים של המקור מאומתים, של שלנו מודל עבודה
lead: {len(orig)} פרומואים כמו במקור, באותם מחירים, ועוד {len(ours)} משלנו. השפעת הפרומו תלויה במיקרופון של המתאבק (1–5 כוכבים).
---

## בקצרה

- **כמו במקור (החלטות 52, 54):** פרומו עצמי, קריאת תיגר (גם לזוגות), אימון, צדקה, פרסומת, החלפת צד, החלפת סגנון ופלישה. המחירים לפי המדריכים של 2K26.
- **משלנו:** שיחה עם מנטור, חתימת חוזה בזירה, נאום האלוף, אתגר פתוח וקטע מאחורי הקלעים.
- **המיקרופון קובע:** אותו פרומו מצליח יותר אצל מתאבק עם 4–5 כוכבים, ועלול להזיק אצל מתאבק עם 1–2 כוכבים.
- **פרומו וקרב באותה תוכנית:** מותר, כמו במקור, אבל עולה בסיבולת. אם המתאבק נפצע לפני הפרומו, הפרומו מתבטל.

## כמו במקור

{table(orig)}

## משלנו

{table(ours)}

## מקורות

- [מדריך מצב המנהל ב-2K26 – NoobFeed](https://www.noobfeed.com/articles/wwe-2k26-mygm-mode)
- [מדריך מצב המנהל ב-2K26 – games.gg](https://games.gg/wwe-2k26/guides/wwe-2-k26-my-gm-mode-guide/)
'''
open(os.path.join(ROOT, 'docs', 'promos.md'), 'w', encoding='utf-8').write(doc)
print(len(orig), 'כמו במקור,', len(ours), 'משלנו')
