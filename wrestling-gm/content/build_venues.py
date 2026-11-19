"""בונה את האולמות של LWF (החלטה 53): 6 שכבות כמו במקור, ובכל שכבה 4 אולמות בדיוניים בערים שונות.
פלט: content/venues.json, docs/venues.md
מספרי השכבות לפי מדריכי 2K26. מחירי השכבות 3–6 לא פורסמו, והם מודל עבודה.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# שכבה, בעברית, מחיר לתוכנית, האם המחיר מאומת, קיבולת, מחיר כרטיס, בונוס איכות
TIERS = [
    ('High School Gym', 'אולם ספורט של בית ספר', 0, True, 2000, 1.5, 5),
    ('Concert Hall', 'אולם קונצרטים', 100000, True, 5000, 2.0, 8),
    ('Wrestling Center', 'מרכז היאבקות', 180000, False, 10000, 2.5, 11),
    ('Arena', 'ארנה', 280000, False, 20000, 3.0, 14),
    ('Stadium', 'אצטדיון', 400000, False, 30000, 3.5, 17),
    ('Colosseum', 'קולוסיאום', 600000, False, 50000, 4.0, 20),
]
PLE_BONUS = {'cost': 50000, 'capacity': 5000, 'ticket': 2.0, 'quality': 5}

# 4 אולמות בדיוניים לכל שכבה: שם, בעברית, עיר, עיר בעברית
VENUES = {
    'High School Gym': [
        ('Northside High Gym', 'אולם תיכון נורת\'סייד', 'Chicago', 'שיקגו'),
        ('Riverbend Academy Gym', 'אולם אקדמיית ריברבנד', 'Nashville', 'נאשוויל'),
        ('St. Brennan\'s Gym', 'אולם סנט ברנן', 'Dublin', 'דבלין'),
        ('Eastgate College Hall', 'אולם קולג\' איסטגייט', 'Manchester', 'מנצ\'סטר'),
    ],
    'Concert Hall': [
        ('The Copper Room', 'חדר הנחושת', 'Detroit', 'דטרויט'),
        ('Harborlight Hall', 'אולם הארבורלייט', 'Glasgow', 'גלזגו'),
        ('The Velvet Theater', 'תיאטרון הקטיפה', 'Paris', 'פריז'),
        ('Lantern Music Hall', 'אולם המוזיקה לנטרן', 'Osaka', 'אוסקה'),
    ],
    'Wrestling Center': [
        ('Ironworks Center', 'מרכז איירונוורקס', 'Philadelphia', 'פילדלפיה'),
        ('The Foundry Dome', 'כיפת היציקה', 'Berlin', 'ברלין'),
        ('Sunset Fight Center', 'מרכז הקרבות סאנסט', 'Las Vegas', 'לאס וגאס'),
        ('Southern Cross Center', 'מרכז סאות\'רן קרוס', 'Sydney', 'סידני'),
    ],
    'Arena': [
        ('Lakeshore Arena', 'ארנת לייקשור', 'Toronto', 'טורונטו'),
        ('Granite Bay Arena', 'ארנת גרניט ביי', 'Houston', 'יוסטון'),
        ('Royal Docks Arena', 'ארנת רויאל דוקס', 'London', 'לונדון'),
        ('Azteca Norte Arena', 'ארנת אסטקה נורטה', 'Mexico City', 'מקסיקו סיטי'),
    ],
    'Stadium': [
        ('Liberty Field', 'אצטדיון ליברטי', 'Atlanta', 'אטלנטה'),
        ('Rising Sun Stadium', 'אצטדיון השמש העולה', 'Tokyo', 'טוקיו'),
        ('Copacabana Stadium', 'אצטדיון קופקבנה', 'São Paulo', 'סאו פאולו'),
        ('Golden Bay Stadium', 'אצטדיון גולדן ביי', 'Auckland', 'אוקלנד'),
    ],
    'Colosseum': [
        ('The Grand Colosseum', 'הקולוסיאום הגדול', 'Rome', 'רומא'),
        ('Legends Dome', 'כיפת האגדות', 'Las Vegas', 'לאס וגאס'),
        ('Empire Field', 'שדה האימפריה', 'Madrid', 'מדריד'),
        ('Pacific Crown Stadium', 'אצטדיון כתר הפסיפיק', 'Honolulu', 'הונולולו'),
    ],
}

data = {
    'tiers': [{'tier': t[0], 'tierHe': t[1], 'cost': t[2], 'costVerified': t[3], 'capacity': t[4], 'ticket': t[5], 'quality': t[6],
               'venues': [{'name': v[0], 'nameHe': v[1], 'city': v[2], 'cityHe': v[3]} for v in VENUES[t[0]]]} for t in TIERS],
    'pleBonus': PLE_BONUS,
}
json.dump(data, open(os.path.join(HERE, 'venues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

rows = ['| שכבה | מחיר לתוכנית | קיבולת | מחיר כרטיס | בונוס איכות | הכנסה מלאה מכרטיסים |', '| --- | --- | --- | --- | --- | --- |']
for t in TIERS:
    cost = 'חינם' if t[2] == 0 else f"${t[2]:,}" + ('' if t[3] else ' [[לאמת]]')
    rows.append(f"| {t[1]} ({t[0]}) | {cost} | {t[4]:,} | ${t[5]:.2f} | +{t[6]}% | ${int(t[4] * t[5]):,} |")

venue_rows = ['| שכבה | אולמות |', '| --- | --- |']
for t in TIERS:
    venue_rows.append(f"| {t[1]} | " + ' · '.join(f"{v[1]} ({v[0]}), {v[3]}" for v in VENUES[t[0]]) + ' |')

doc = f'''---
title: האולמות
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: המספרים לפי המקור, חלק מהמחירים מודל עבודה
lead: 6 שכבות אולמות כמו במקור, מאולם ספורט של בית ספר ועד קולוסיאום, ובכל שכבה 4 אולמות בדיוניים בערים שונות. 24 אולמות בסך הכול.
---

## בקצרה

- **כמו במקור (החלטה 53):** אותן 6 שכבות ואותם מספרים: קיבולת, מחיר כרטיס ובונוס איכות לתוכנית.
- **אולמות בדיוניים:** בכל שכבה 4 אולמות בערים שונות, כך שהתוכנית מסתובבת בעולם כמו סיבוב אמיתי. בתוך השכבה ההבדל רק בשם ובעיר, לא במספרים.
- **אירוע שיא:** באירוע שיא כל אולם מקבל תוספת: 5,000 מקומות, 2 דולר לכרטיס ו-5% איכות, ב-50 אלף דולר נוספים, כמו במקור.
- **ההחלטה השבועית:** אולם גדול עולה יותר, אבל מכניס יותר מכרטיסים ומעלה את ציון התוכנית. כדאי רק כשיש מספיק פופולריות כדי למלא אותו.

## השכבות

{chr(10).join(rows)}

> [!לאמת]
> המחירים של אולם הספורט (חינם) ושל אולם הקונצרטים (100 אלף דולר) מאומתים מהמדריכים. המחירים של ארבע השכבות הגבוהות לא פורסמו, והם מודל עבודה. "הכנסה מלאה" היא קיבולת כפול מחיר כרטיס, כשהאולם מלא.

## האולמות

{chr(10).join(venue_rows)}

## מקורות

- [מדריך מצב המנהל ב-2K26 – The SmackDown Hotel](https://www.thesmackdownhotel.com/news/wwe2k26/wwe-2k26-mygm-mode-full-guide-all-features-tips-tricks)
- [מדריך מצב המנהל ב-2K26 – NoobFeed](https://www.noobfeed.com/articles/wwe-2k26-mygm-mode)
- [מדריך מצב המנהל ב-2K26 – games.gg](https://games.gg/wwe-2k26/guides/wwe-2-k26-my-gm-mode-guide/)
'''
open(os.path.join(ROOT, 'docs', 'venues.md'), 'w', encoding='utf-8').write(doc)
print(len(TIERS), 'שכבות,', sum(len(v) for v in VENUES.values()), 'אולמות')
