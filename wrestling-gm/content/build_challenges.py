"""בונה את האתגרים העונתיים והישגי הקריירה של LWF (החלטה 56).
פלט: content/challenges.json, docs/challenges.md
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# 20 אתגרים עונתיים: שם, בעברית, תחום, יעד בעברית, יעד באנגלית
SEASONAL = [
    ('Five-Star Night', 'לילה של חמישה כוכבים', 'קרבות', 'קרב של 5 כוכבים באירוע שיא.', 'A 5-star match at a premium event.'),
    ('Consistent Quality', 'איכות יציבה', 'קרבות', '10 תוכניות שבועיות של 3.5 כוכבים ומעלה.', '10 weekly shows rated 3.5 stars or higher.'),
    ('Main Event Mastery', 'מאסטר הקרב הראשי', 'קרבות', '5 קרבות ראשיים של 4 כוכבים ומעלה.', '5 main events rated 4 stars or higher.'),
    ('Stipulation Showcase', 'חגיגת תנאים', 'קרבות', 'להשתמש ב-8 תנאים שונים במהלך העונה.', 'Use 8 different stipulations this season.'),
    ('Hot Rivalry', 'יריבות לוהטת', 'יריבויות', 'להביא 3 יריבויות לרמה 4.', 'Take 3 rivalries to level 4.'),
    ('Blood Feud Finale', 'סיום יריבות גדול', 'יריבויות', 'לסיים יריבות ברמה 4 בקרב כלוב או בכספת.', 'End a level-4 rivalry in a Steel Cage or The Vault.'),
    ('Golden Era', 'עידן הזהב', 'תארים', '6 החלפות תואר במהלך העונה.', '6 title changes this season.'),
    ('Dominant Champion', 'אלוף שולט', 'תארים', 'אלוף שמחזיק בתואר העולמי 15 שבועות ברצף.', 'A world champion who holds the title 15 weeks straight.'),
    ('Star Is Born', 'נולד כוכב', 'פיתוח', 'להעלות צעיר בפיתוח לפופולריות 50.', 'Raise a Prospect to 50 popularity.'),
    ('Training Camp', 'מחנה אימונים', 'פיתוח', '12 פרומואי אימון במהלך העונה.', '12 training promos this season.'),
    ('Silver Tongue', 'לשון של כסף', 'פרומואים', '10 פרומואים מוצלחים של מתאבקים עם 4–5 כוכבים במיקרופון.', '10 successful promos by 4–5 star talkers.'),
    ('Charity Drive', 'מבצע צדקה', 'פרומואים', '5 פרומואי צדקה.', '5 charity promos.'),
    ('Sold Out Tour', 'סיבוב סולד אאוט', 'כלכלה', '8 תוכניות באולם מלא.', '8 shows in a full venue.'),
    ('Big Spender', 'בזבזן', 'כלכלה', 'להוציא 2 מיליון דולר על אולמות והפקה.', 'Spend $2M on venues and production.'),
    ('In The Black', 'ברווח', 'כלכלה', 'לסיים את העונה עם יותר כסף משהתחלת.', 'End the season with more money than you started with.'),
    ('Talent Hunter', 'צייד כישרונות', 'גיוס', 'להחתים 6 מתאבקים במהלך העונה.', 'Sign 6 superstars this season.'),
    ('Legends Night', 'ערב אגדות', 'גיוס', 'שתי אגדות באותו אירוע שיא.', 'Two legends at the same premium event.'),
    ('Happy Locker Room', 'חדר הלבשה מרוצה', 'ניהול', 'למלא 10 בקשות של מתאבקים.', 'Fulfill 10 superstar requests.'),
    ('Iron Roster', 'רוסטר מברזל', 'ניהול', 'לעבור 10 שבועות ברצף בלי פציעה.', 'Go 10 weeks in a row without an injury.'),
    ('Ratings Leader', 'מוביל הרייטינג', 'ניהול', 'להיות במקום הראשון בדירוג בשבוע 25 ובשבוע 50.', 'Be ranked first at week 25 and week 50.'),
]

# הישגי קריירה (חד-פעמיים לאורך כל הקריירה): שם, בעברית, יעד בעברית, יעד באנגלית, גביעים
CAREER = [
    ('Season Champion', 'אלוף העונה', 'לסיים עונה במקום הראשון.', 'Finish a season in first place.', 1),
    ('Dynasty', 'שושלת', 'לסיים 3 עונות ברצף במקום הראשון.', 'Finish first 3 seasons in a row.', 2),
    ('Underdog Brand', 'מותג אנדרדוג', 'לזכות בעונה עם התקציב הנמוך ביותר בליגה.', 'Win a season with the lowest budget in the league.', 1),
    ('Homegrown', 'גידול בית', 'שמתאבק שהגיע מכישרון מקומי יהפוך לאלוף עולם.', 'Turn a local talent signee into a world champion.', 1),
    ('Legend Maker', 'יוצר אגדות', 'להעלות מתאבק לרמת ניסיון 25 (בן אלמוות).', 'Raise a superstar to ring level 25 (Immortal).', 1),
    ('Full House', 'בית מלא', 'קולוסיאום מלא באירוע הסיום של העונה.', 'A full Colosseum at the season finale.', 1),
    ('Perfect Ten', 'עשר מושלם', '10 קרבות של 5 כוכבים בקריירה.', '10 five-star matches over your career.', 1),
    ('Kingmaker', 'עושה המלכים', 'כל תארי המותג מוחזקים על ידי מתאבקים שגייסת בעצמך (לא מהדראפט).', 'All your brand\'s titles held by superstars you signed yourself (not drafted).', 2),
]
HOF_TROPHIES = 10

data = {
    'seasonal': [{'name': c[0], 'nameHe': c[1], 'area': c[2], 'goal': c[3], 'goalEn': c[4]} for c in SEASONAL],
    'career': [{'name': c[0], 'nameHe': c[1], 'goal': c[2], 'goalEn': c[3], 'trophies': c[4]} for c in CAREER],
    'rules': {'seasonalPerTrophy': 5, 'maxSeasonalTrophies': 4, 'hallOfFameTrophies': HOF_TROPHIES, 'tieBreak': 'cash'},
}
json.dump(data, open(os.path.join(HERE, 'challenges.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

s_rows = ['| # | אתגר | תחום | היעד |', '| --- | --- | --- | --- |']
for i, c in enumerate(SEASONAL, 1):
    s_rows.append(f"| {i} | {c[1]} ({c[0]}) | {c[2]} | {c[3]} |")
c_rows = ['| הישג | היעד | גביעים |', '| --- | --- | --- |']
for c in CAREER:
    c_rows.append(f"| {c[1]} ({c[0]}) | {c[2]} | {c[4]} |")

doc = f'''---
title: אתגרים והיכל התהילה
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: החוקים לפי המקור, האתגרים עצמם שלנו
lead: 20 אתגרים בכל עונה, וכל 5 שהושלמו נותנים גביע, כמו במקור. בנוסף, {len(CAREER)} הישגי קריירה. מי שמגיע ראשון ל-{HOF_TROPHIES} גביעים נכנס להיכל התהילה.
---

## בקצרה

- **החוקים, כמו במקור (החלטה 56):**
  - 20 אתגרים עונתיים, וכל 5 שהושלמו נותנים גביע. לכן אפשר לקבל עד 4 גביעים בעונה מאתגרים.
  - הישגי קריירה הם מקור נוסף לגביעים.
  - הטקס מתקיים בסוף העונה שבה מנהל כלשהו הגיע ל-{HOF_TROPHIES} גביעים. בשוויון קובע מי שיש לו יותר כסף.
  - אפשר לדרג את המותגים לפי מעריצים או לפי גביעים.
- **האתגרים עצמם שלנו:** הרשימה של המקור לא פורסמה, אז בנינו 20 אתגרים שמכסים את כל חלקי המשחק: קרבות, יריבויות, תארים, פיתוח, פרומואים, כלכלה, גיוס וניהול.
- **בעונה של 25 שבועות:** היעדים המספריים קטנים בחצי [[לאמת]].

> [!לאמת]
> כמה גביעים נדרשים להיכל התהילה ב-2K26, והיעדים המספריים של כל אתגר, יכוילו במחקר ובסימולטור. 10 גביעים הוא המספר שהופיע במדריכי 2K23.

## 20 האתגרים העונתיים

{chr(10).join(s_rows)}

## הישגי קריירה

{chr(10).join(c_rows)}

## מקורות

- [מה חדש במצב המנהל ב-2K26 – Operation Sports](https://www.operationsports.com/everything-new-in-wwe-2k26-mygm-mode/)
- [מדריך מצב המנהל ב-2K26 – games.gg](https://games.gg/wwe-2k26/guides/wwe-2-k26-my-gm-mode-guide/)
'''
open(os.path.join(ROOT, 'docs', 'challenges.md'), 'w', encoding='utf-8').write(doc)
print(len(SEASONAL), 'אתגרים,', len(CAREER), 'הישגי קריירה')
