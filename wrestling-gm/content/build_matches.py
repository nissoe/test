"""בונה את קטלוג סוגי הקרבות של LWF (החלטה 51): פורמטים ותנאים כמו במקור, ועוד קרבות מקוריים שלנו.
פלט: content/match_types.json, docs/matches.md
מחיר: דרגה 1–5 (המחיר המדויק ייקבע במחקר המספרים). סיבולת: כמה נשחק מכל משתתף. בונוס: תוספת לציון הקרב.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# שם, בעברית, משתתפים, הערה בעברית, הערה באנגלית
FORMATS = [
    ('Singles', 'יחיד מול יחיד', '2', 'הבסיס.', 'The basic match.'),
    ('Tag Team', 'זוגות', '2×2', 'צמדים אמיתיים מקבלים בונוס.', 'Real tag teams get a bonus.'),
    ('Triple Threat', 'משולש', '3', '', ''),
    ('Fatal 4-Way', 'רביעייה', '4', '', ''),
    ('5-Way', '5 משתתפים', '5', 'חדש ב-2K26.', 'New in 2K26.'),
    ('6-Way', '6 משתתפים', '6', 'חדש ב-2K26.', 'New in 2K26.'),
    ('8-Way', '8 משתתפים', '8', 'חדש ב-2K26.', 'New in 2K26.'),
    ('3-on-3', '3 מול 3', '3×3', '', ''),
    ('4-on-4', '4 מול 4', '4×4', '', ''),
    ('Handicap 1v2', 'נכות 1 מול 2', '1+2', 'מי שמנצח לבד מקבל בונוס פופולריות.', 'A solo winner gains bonus popularity.'),
    ('Handicap 1v3', 'נכות 1 מול 3', '1+3', '', ''),
    ('Handicap 1v4', 'נכות 1 מול 4', '1+4', '', ''),
    ('Triple Threat Tag', 'משולש זוגות', '3×2', '', ''),
    ('Fatal 4-Way Tag', 'רביעיית זוגות', '4×2', '', ''),
    ('Intergender', 'מעורב', 'כל פורמט', 'תוספת מחיר, כמו ב-2K26.', 'Extra booking cost, as in 2K26.'),
]

# שם, בעברית, מקור, מחיר 1–5, סיבולת, בונוס כוכבים, סיכוי ליריבות, נפתח, תיאור בעברית, תיאור באנגלית
STIPS = [
    # ---- כמו במקור ----
    ('Standard', 'רגיל', 'original', 1, 'רגילה', 0, 'רגיל', 'מההתחלה', 'נצחון בהצמדה, הכנעה או פסילה.', 'Win by pinfall, submission or DQ.'),
    ('No Disqualification', 'בלי פסילות', 'original', 2, 'גבוהה', 0.25, 'גבוה', 'מההתחלה', 'הכול מותר.', 'Anything goes.'),
    ('Falls Count Anywhere', 'הצמדה בכל מקום', 'original', 2, 'גבוהה', 0.25, 'גבוה', 'מההתחלה', 'אפשר לנצח בכל מקום באולם.', 'Pins count anywhere in the arena.'),
    ('Submission', 'הכנעה בלבד', 'original', 2, 'רגילה', 0.25, 'רגיל', 'מההתחלה', 'רק הכנעה מנצחת. לוחמים מקבלים בונוס.', 'Only a submission wins. Fighters get a bonus.'),
    ('Last Man Standing', 'האחרון שעומד', 'original', 3, 'גבוהה מאוד', 0.5, 'גבוה', 'שבוע 4', 'מנצח מי שהיריב לא קם עד ספירת 10.', 'Win when the opponent cannot answer a 10 count.'),
    ('I Quit', 'אני מוותר', 'original', 3, 'גבוהה מאוד', 0.5, 'גבוה מאוד', 'שבוע 4', 'היריב חייב להגיד את המילים.', 'The opponent must say the words.'),
    ('Tables', 'שולחנות', 'original', 2, 'גבוהה', 0.25, 'גבוה', 'מההתחלה', 'מנצח מי ששובר שולחן עם היריב.', 'Put your opponent through a table to win.'),
    ('Ladder', 'סולם', 'original', 3, 'גבוהה מאוד', 0.5, 'גבוה', 'שבוע 4', 'מטפסים ומורידים את מה שתלוי מעל הזירה. קלי-משקל מקבלים בונוס.', 'Climb and retrieve what hangs above the ring. Cruisers get a bonus.'),
    ('Steel Cage', 'כלוב', 'original', 3, 'גבוהה מאוד', 0.5, 'מסיים יריבות', 'שבוע 8', 'סיכוי מוגבר להעלות יריבות, ומסיים אותה.', 'Higher chance to raise a rivalry, and it ends it.'),
    ('Battle Royal', 'קרב המוני', 'original', 3, 'נמוכה', 0.25, 'נמוך', 'מההתחלה', 'זריקה מעל החבל העליון. ענקים מקבלים בונוס.', 'Over the top rope eliminations. Giants get a bonus.'),
    ('Gauntlet', 'גאונטלט', 'original', 3, 'גבוהה מאוד', 0.5, 'רגיל', 'שבוע 8', 'מתאבק אחד מול רצף יריבים, אחד אחרי השני.', 'One superstar against a run of opponents, one at a time.'),
    ('Gauntlet Eliminator', 'גאונטלט הדחה', 'original', 3, 'גבוהה', 0.5, 'רגיל', 'שבוע 8', 'כולם נכנסים בזה אחר זה, והמודח יוצא.', 'Everyone enters in turn, eliminated wrestlers leave.'),
    ('Dumpster', 'פח זבל', 'original', 2, 'גבוהה', 0.25, 'גבוה', 'שבוע 4', 'מנצח מי שסוגר את היריב בפח.', 'Shut your opponent inside the dumpster to win.'),
    # ---- כמו במקור, עם שם משלנו ----
    ('Ring of Fire', 'טבעת אש', 'renamed', 4, 'גבוהה מאוד', 0.75, 'גבוה מאוד', 'שבוע 12', 'הזירה מוקפת להבות. מנצח מי שמצית את היריב. (במקור: Inferno)', 'Flames surround the ring. Set your opponent alight to win.'),
    ('Three Stages', 'שלושה שלבים', 'renamed', 4, 'גבוהה מאוד', 0.75, 'גבוה מאוד', 'שבוע 12', 'שלוש נפילות, כל אחת בתנאי אחר. (במקור: 3 Stages of Hell)', 'Three falls, each under a different stipulation.'),
    ('Blood Oath Rules', 'חוקי השבועה', 'renamed', 3, 'גבוהה', 0.5, 'גבוה', 'שבוע 8', 'בני ברית יכולים להתערב בלי פסילה. (במקור: Bloodline Rules)', 'Allies may interfere without a DQ.'),
    ('The Vault', 'הכספת', 'renamed', 5, 'קיצונית', 1, 'מסיים יריבות', 'אירועי שיא', 'כלוב ענק עם תקרה, רק באירועי שיא. (במקור: Hell in a Cell)', 'A huge roofed cage, premium events only.'),
    ('Fight Pit', 'בור הקרב', 'renamed', 3, 'גבוהה', 0.5, 'גבוה', 'שבוע 8', 'זירה בלי חבלים, רק נוקאאוט או הכנעה. (במקור: Underground)', 'A ropeless ring, knockout or submission only.'),
    ('Legends Rush', 'מרוץ האגדות', 'renamed', 5, 'נמוכה', 1, 'נמוך', 'אירועי שיא', '30 משתתפים שנכנסים כל דקה וחצי, זריקה מעל החבל. המנצח מקבל קרב תואר באירוע השיא הגדול. (בהשראת Royal Rumble)', '30 entrants arriving every 90 seconds, over the top rope. The winner earns a title shot at the biggest event.'),
    # ---- מקוריים שלנו ----
    ('Crowd\'s Choice', 'בחירת הקהל', 'ours', 2, 'משתנה', 0.25, 'רגיל', 'שבוע 4', 'הקהל מצביע על התנאי ברגע האחרון: תנאי אקראי מהרשימה, ובונוס התרגשות.', 'The crowd votes the stipulation at the last moment: a random one from the list, plus an excitement bonus.'),
    ('Legacy Match', 'קרב המורשת', 'ours', 4, 'גבוהה', 0.75, 'מסיים יריבות', 'שבוע 12', 'המפסיד מאבד 10 פופולריות והמנצח מקבל 10. רק ליריבות ברמה 3 ומעלה.', 'The loser loses 10 popularity and the winner gains 10. Rivalries at level 3+ only.'),
    ('Title vs Title', 'תואר מול תואר', 'ours', 4, 'גבוהה', 1, 'גבוה', 'אירועי שיא', 'שני אלופים, המנצח מחזיק בשני התארים.', 'Two champions, the winner holds both titles.'),
    ('Golden Ticket Ladder', 'סולם כרטיס הזהב', 'ours', 4, 'גבוהה מאוד', 0.75, 'רגיל', 'אירועי שיא', 'המנצח מוריד כרטיס זהב: קרב תואר מתי שירצה במשך העונה.', 'The winner pulls down a golden ticket: a title shot whenever they choose this season.'),
    ('Clockwork', 'שעון חול', 'ours', 3, 'גבוהה מאוד', 0.5, 'גבוה', 'שבוע 8', '20 דקות, מנצח מי שצבר יותר נפילות. מתאבקים עם סיבולת גבוהה מקבלים בונוס.', '20 minutes, most falls wins. High-stamina wrestlers get a bonus.'),
    ('Lumberjack', 'חוטבי עצים', 'ours', 2, 'רגילה', 0.25, 'גבוה', 'מההתחלה', 'מתאבקים מקיפים את הזירה ומחזירים פנימה כל מי שבורח.', 'Wrestlers surround the ring and throw back anyone who escapes.'),
    ('Blackout', 'החשכה', 'ours', 3, 'גבוהה', 0.5, 'גבוה מאוד', 'שבוע 8', 'האורות כבים לרגעים, והכול יכול לקרות: התערבויות והפתעות. התוצאה פחות צפויה.', 'The lights go out at moments and anything can happen: run-ins and surprises. Less predictable.'),
    ('Rookie Gauntlet', 'מבחן הטירון', 'ours', 2, 'גבוהה מאוד', 0.25, 'נמוך', 'מההתחלה', 'צעיר מול שלושה ותיקים. אם הוא שורד, הוא מקבל ניסיון כפול ו-8 פופולריות.', 'A Prospect against three veterans. If they survive, they gain double XP and 8 popularity.'),
    ('Tag Turmoil', 'מערבולת זוגות', 'ours', 3, 'גבוהה', 0.5, 'רגיל', 'שבוע 8', 'חמישה צמדים ברצף, המנצחים נשארים בזירה. המנצח האחרון מקבל קרב על תואר הזוגות.', 'Five teams in a row, winners stay in. The last team standing earns a tag title shot.'),
]

matches = {
    'formats': [{'name': f[0], 'nameHe': f[1], 'participants': f[2], 'note': f[3], 'noteEn': f[4]} for f in FORMATS],
    'stipulations': [{
        'name': s[0], 'nameHe': s[1], 'origin': s[2], 'costTier': s[3], 'stamina': s[4], 'starBonus': s[5],
        'rivalry': s[6], 'unlock': s[7], 'desc': s[8], 'descEn': s[9],
    } for s in STIPS],
}
json.dump(matches, open(os.path.join(HERE, 'match_types.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

origin_he = {'original': 'כמו במקור', 'renamed': 'כמו במקור, שם משלנו', 'ours': 'מקורי שלנו'}
fmt_rows = ['| פורמט | משתתפים | הערה |', '| --- | --- | --- |'] + [f"| {f[1]} ({f[0]}) | {f[2]} | {f[3]} |" for f in FORMATS]
sections = []
for key in ('original', 'renamed', 'ours'):
    rows = [s for s in STIPS if s[2] == key]
    t = ['| תנאי | מחיר | סיבולת | בונוס | יריבות | נפתח | מה זה |', '| --- | --- | --- | --- | --- | --- | --- |']
    for s in rows:
        t.append(f"| {s[1]} ({s[0]}) | {'$' * s[3]} | {s[4]} | +{s[5]:g}★ | {s[6]} | {s[7]} | {s[8]} |")
    sections.append(f"### {origin_he[key]} ({len(rows)})\n\n" + '\n'.join(t))

doc = f'''---
title: סוגי הקרבות
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: טיוטה, המספרים לפי מודל עבודה
lead: {len(FORMATS)} פורמטים ו-{len(STIPS)} תנאים: כל מה שיש במקור, עם שם משלנו לתנאים ששמם שייך ל-WWE, ועוד {sum(1 for s in STIPS if s[2] == "ours")} קרבות מקוריים שלנו.
---

## בקצרה

- **כמו במקור (החלטה 51):** כל הפורמטים של 2K26, כולל 5, 6 ו-8 משתתפים, קרבות נכות וקרבות מעורבים.
- **שמות משלנו:** תנאים ששמם שייך ל-WWE קיבלו שם מקורי, למשל הכספת במקום Hell in a Cell, וטבעת אש במקום Inferno.
- **קרבות מקוריים שלנו:** למשל קרב המורשת, סולם כרטיס הזהב, החשכה ומבחן הטירון.
- **נעילה כמו במקור:** חלק מהתנאים נפתחים במהלך העונה, בתשלום חד-פעמי בפעם הראשונה. חלק זמינים רק באירועי שיא.
- **מחיר וסיבולת:** תנאי מיוחד עולה יותר כסף ושוחק יותר סיבולת, אבל מעלה את ציון הקרב.

> [!לאמת]
> המחיר מוצג בדרגות ($ עד $$$$$). הסכומים, הבונוסים ושבועות הפתיחה הם מודל עבודה, ויכוילו במחקר המספרים ובסימולטור.

## פורמטים

{chr(10).join(fmt_rows)}

## תנאים

{chr(10).join(sections)}
'''
open(os.path.join(ROOT, 'docs', 'matches.md'), 'w', encoding='utf-8').write(doc)
print(len(FORMATS), 'פורמטים,', len(STIPS), 'תנאים')
