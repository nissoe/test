"""בונה את קלפי הכוח של LWF: קלף בלעדי לכל אחד מ-20 המנהלים, וחנות קלפים.
פלט: content/gms.json, content/shop_cards.json, docs/cards.md
המספרים הם מודל עבודה עד מחקר המספרים של המקור (החלטה 23).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

FAMILY_EN = {'כלכלה': 'Economy', 'יריבויות': 'Rivalries', 'התאוששות': 'Recovery', 'התקפה': 'Sabotage'}
USE_EN = {'כל העונה': 'All season', 'פעם בעונה': 'Once per season', 'פעמיים בעונה': 'Twice per season', '3 פעמים בעונה': '3 times per season'}
RARITY_EN = {'רגיל': 'Common', 'נדיר': 'Rare', 'אפי': 'Epic', 'אגדי': 'Legendary'}
SHOP_USE_EN = {'חד-פעמי': 'Single use', 'פועל 2 שבועות': 'Lasts 2 weeks', 'פועל 4 שבועות': 'Lasts 4 weeks', 'פועל 6 שבועות': 'Lasts 6 weeks'}
CATEGORY_EN = {'פופולריות': 'Popularity', 'בריאות': 'Health', 'מורל': 'Morale', 'כסף': 'Money', 'קהל': 'Crowd', 'קרבות': 'Matches',
               'יריבויות': 'Rivalries', 'תארים': 'Titles', 'גיוס': 'Recruiting', 'פיתוח': 'Development', 'התקפה': 'Sabotage'}
EFFECT_EN = {
    'Golden Gate': 'Every show earns 5% more from tickets.',
    'Open Checkbook': 'All matches are free for one week.',
    'Prime Time Deal': 'Logistics bonuses are doubled for one week.',
    'Bargain Hunter': 'All shop cards are 15% cheaper.',
    'Legend Network': '2 extra Legends appear in the pool this week, and signing them costs half.',
    'Fan The Flames': 'All active rivalries go up two levels.',
    'Bad Blood': 'One rivalry jumps straight to level 4.',
    'Silver Tongue': 'All promos this week have double effect.',
    'Grudge Match': 'One rivalry match this week gets a full extra star.',
    'Spotlight': 'One superstar gains 8 popularity.',
    'Sports Medicine': 'Every injury on the roster is 25% shorter.',
    'Ice Bath': '+15 stamina for the whole roster.',
    'Family Dinner': 'The whole roster gains 20 morale.',
    'Second Wind': 'One superstar returns to full stamina.',
    'The Dojo': 'Training week: Prospects and Rising Stars earn triple XP.',
    'Backstage Ambush': 'Two random superstars of a rival are injured before their next show.',
    'Poach': 'Take a superstar from a rival brand permanently (not a champion).',
    'Bad Press': "A rival's whole roster loses 5 popularity.",
    'Sabotage': "A rival's venue quality bonus is cancelled for one week.",
    'Inside Information': "This week you see every rival's full card before you lock yours.",
    'Blood Feud': 'One rivalry match gets a full extra star and both wrestlers gain 5 popularity. Injury risk in the match is doubled.',
    'Hardcore Rules': 'One match this week becomes a no-DQ match for free and gets an extra half star.',
    'Star Power': 'The 3 most popular superstars on the roster gain 5 popularity.',
    'Red Carpet': 'Attendance at this show grows by 15%.',
    'Sky High': 'Every match this week with a Cruiser gets a full extra star.',
    'Fast Track': 'One Rising Star goes up one ring level.',
    'Call-Up': 'One Prospect becomes a Star: +20 popularity and +2 ring levels.',
    'Showcase': 'All Prospects on this week\'s card earn double XP and gain 3 popularity.',
    'Total Chaos': 'One match becomes a wild brawl: +1.5 stars, but a random winner and double stamina loss.',
    'Crowd Surge': "Every rivalry on this week's card goes up one level.",
    'Hype Video': 'One superstar gains 3 popularity.',
    'Water Break': 'One superstar gains 10 stamina.',
    'Pep Talk': "One superstar's morale goes up 15.",
    'Street Team': 'Attendance at the next show grows by 5%.',
    'Local Sponsor': '+$50K to the budget.',
    'Quick Rehab': "One superstar's injury is one week shorter.",
    'Scouting Tip': 'One extra scout this week.',
    'Promo Coach': 'Promos this week have 25% more effect.',
    'Main Event Push': 'The main event this week gets an extra half star.',
    'Rivalry Spark': 'A new rivalry starts at level 2.',
    'Merch Drop': '+$150K to the budget.',
    'Medical Team': 'Every injury on the roster is one week shorter.',
    'Contract Extension': "A Legend's or Free Agent's contract is extended by 5 weeks.",
    'Title Hype': 'One title match this week gets an extra half star.',
    'TV Deal': 'Revenue from every show grows by 10%.',
    'Training Facility': 'The whole roster earns 25% more XP.',
    'Hot Crowd': 'Every match on this show gets an extra half star.',
    'Roster Depth': 'You can hold 3 superstars over the roster limit.',
    'Legend Return': 'Sign one Legend for free.',
    'Crowd Favorite': "One superstar's popularity rises to 90.",
    'Corporate Raid': "Take $200K from a rival's budget.",
    'Main Event Magic': 'The main event this week gets 1.5 extra stars.',
}

# סוגי שימוש
USE = {
    'passive': 'קבוע: יתרון קטן לאורך כל העונה',
    'limited': 'מוגבל: פעם עד 3 פעמים בעונה',
}

# id, שם, שם בעברית, משפחה, קלף, קלף בעברית, סוג, פירוט שימוש, אפקט, משנה משחק?
GMS = [
    ('Victoria Sterling', 'ויקטוריה סטרלינג', 'כלכלה', 'Golden Gate', 'שער הזהב', 'passive', 'כל העונה',
     'כל תוכנית מכניסה 5% יותר מכרטיסים.', False),
    ('Raymond Kessington', 'ריימונד קסינגטון', 'כלכלה', 'Open Checkbook', 'פנקס פתוח', 'limited', '3 פעמים בעונה',
     'כל הקרבות בחינם לשבוע אחד.', False),
    ('Delphine Ortiz', 'דלפין אורטיז', 'כלכלה', 'Prime Time Deal', 'עסקת פריים טיים', 'limited', '3 פעמים בעונה',
     'בונוסי הלוגיסטיקה כפולים לשבוע אחד.', False),
    ('Marcus Whitfield', 'מרקוס ויטפילד', 'כלכלה', 'Bargain Hunter', 'צייד מציאות', 'passive', 'כל העונה',
     'כל הקלפים בחנות זולים ב-15%.', False),
    ('Sofia Bellucci', 'סופיה בלוצ\'י', 'כלכלה', 'Legend Network', 'רשת האגדות', 'limited', 'פעמיים בעונה',
     'השבוע מופיעות 2 אגדות נוספות במאגר, וחתימה שלהן זולה בחצי.', True),
    ('Big Al Montague', 'ביג אל מונטגיו', 'יריבויות', 'Fan The Flames', 'ללבות את האש', 'limited', 'פעם בעונה',
     'כל היריבויות הפעילות עולות בשתי רמות.', True),
    ('Nadia Rahimi', 'נדיה רחימי', 'יריבויות', 'Bad Blood', 'דם רע', 'limited', 'פעמיים בעונה',
     'יריבות אחת קופצת ישר לרמה 4.', False),
    ('Theo Lancaster', 'תאו לנקסטר', 'יריבויות', 'Silver Tongue', 'לשון זהב', 'limited', '3 פעמים בעונה',
     'כל הפרומואים בשבוע הזה משפיעים כפול.', False),
    ('Ingrid Solberg', 'אינגריד סולברג', 'יריבויות', 'Grudge Match', 'קרב חשבונות', 'limited', '3 פעמים בעונה',
     'קרב יריבות אחד בשבוע הזה מקבל כוכב שלם נוסף.', False),
    ('Felix Okoro', 'פליקס אוקורו', 'יריבויות', 'Spotlight', 'זרקור', 'limited', '3 פעמים בעונה',
     'מתאבק אחד מקבל 8 פופולריות.', False),
    ('Dr. Helena Voss', 'ד"ר הלנה ווס', 'התאוששות', 'Sports Medicine', 'רפואת ספורט', 'passive', 'כל העונה',
     'כל פציעה ברוסטר קצרה ב-25%.', False),
    ('Coach Brandon Reyes', 'המאמן ברנדון רייס', 'התאוששות', 'Ice Bath', 'אמבט קרח', 'limited', '3 פעמים בעונה',
     '15 סיבולת לכל הרוסטר.', False),
    ('Mama Lucia', 'מאמא לוצ\'יה', 'התאוששות', 'Family Dinner', 'ארוחה משפחתית', 'limited', 'פעמיים בעונה',
     'המורל של כל הרוסטר עולה ב-20.', False),
    ('Garrett Pike', 'גארט פייק', 'התאוששות', 'Second Wind', 'רוח שנייה', 'limited', '3 פעמים בעונה',
     'מתאבק אחד חוזר לסיבולת מלאה.', False),
    ('Yuki Tanabe', 'יוקי טנאבה', 'התאוששות', 'The Dojo', 'הדוג\'ו', 'limited', 'פעמיים בעונה',
     'שבוע אימונים: צעירים בפיתוח וכוכבים עולים צוברים פי 3 ניסיון.', True),
    ('Dante Corvino', 'דנטה קורבינו', 'התקפה', 'Backstage Ambush', 'מארב מאחורי הקלעים', 'limited', 'פעמיים בעונה',
     'שני מתאבקים אקראיים של יריב נפצעים לפני התוכנית הבאה שלו.', False),
    ('Serena Blackwell', 'סרינה בלקוול', 'התקפה', 'Poach', 'חטיפה', 'limited', 'פעם בעונה',
     'לוקחים מתאבק ממותג יריב לצמיתות (לא מחזיק תואר).', True),
    ('Ox Brannigan', 'אוקס בראניגן', 'התקפה', 'Bad Press', 'עיתונות רעה', 'limited', 'פעמיים בעונה',
     'כל הרוסטר של יריב אחד מאבד 5 פופולריות.', False),
    ('Vivienne Lacroix', 'ויויאן לקרואה', 'התקפה', 'Sabotage', 'חבלה', 'limited', '3 פעמים בעונה',
     'בונוס האיכות של האולם של יריב אחד מתבטל לשבוע אחד.', False),
    ('The Commissioner', 'הנציב', 'התקפה', 'Inside Information', 'מידע פנימי', 'limited', 'פעמיים בעונה',
     'השבוע רואים את כל הכרטיס של כל יריב לפני שנועלים את שלך.', True),
]

# קלפים ייעודיים לכל תוכנית (החלטה 45): שניים לכל תוכנית, לפי האופי שלה
# תוכנית, קלף, בעברית, שימוש, אפקט, משנה משחק?
BRAND_CARDS = [
    ('Rage', 'Blood Feud', 'נקמת דם', 'פעמיים בעונה', 'קרב יריבות אחד מקבל כוכב שלם נוסף, ושני המשתתפים מקבלים 5 פופולריות. סיכון הפציעה בקרב כפול.', False),
    ('Rage', 'Hardcore Rules', 'חוקי הארדקור', '3 פעמים בעונה', 'קרב אחד בשבוע הזה הופך לקרב בלי פסילות, בחינם, ומקבל חצי כוכב נוסף.', False),
    ('Throwdown', 'Star Power', 'כוח כוכבים', 'פעמיים בעונה', 'שלושת המתאבקים הפופולריים ביותר ברוסטר מקבלים 5 פופולריות.', False),
    ('Throwdown', 'Red Carpet', 'שטיח אדום', '3 פעמים בעונה', 'הקהל בתוכנית הזו גדל ב-15%.', False),
    ('Ignite', 'Sky High', 'בשמיים', 'פעמיים בעונה', 'כל הקרבות בשבוע הזה שיש בהם מתאבק קל-משקל מקבלים כוכב שלם נוסף.', False),
    ('Ignite', 'Fast Track', 'מסלול מהיר', '3 פעמים בעונה', 'כוכב עולה אחד עולה רמת ניסיון אחת.', False),
    ('Breakout', 'Call-Up', 'קידום לסגל הראשי', 'פעם בעונה', 'צעיר בפיתוח אחד הופך לכוכב: 20 פופולריות ו-2 רמות ניסיון.', True),
    ('Breakout', 'Showcase', 'חלון ראווה', '3 פעמים בעונה', 'כל הצעירים בכרטיס השבוע צוברים ניסיון כפול ומקבלים 3 פופולריות.', False),
    ('Uproar', 'Total Chaos', 'כאוס מוחלט', 'פעמיים בעונה', 'קרב אחד הופך לקטטה פרועה: כוכב וחצי נוספים, אבל התוצאה אקראית והסיבולת נשחקת כפול.', True),
    ('Uproar', 'Crowd Surge', 'גל קהל', '3 פעמים בעונה', 'כל יריבות שמופיעה בכרטיס השבוע עולה ברמה אחת.', False),
]

# חנות (החלטה 50): שם, בעברית, נדירות, שימוש, קטגוריה, אפקט בעברית, אפקט באנגלית
SHOP = [
    # ---- רגיל (24) ----
    ('Hype Video', 'סרטון הייפ', 'רגיל', 'חד-פעמי', 'פופולריות', 'מתאבק אחד מקבל 3 פופולריות.', 'One superstar gains 3 popularity.'),
    ('Social Buzz', 'באז ברשתות', 'רגיל', 'חד-פעמי', 'פופולריות', 'שני מתאבקים מקבלים 2 פופולריות כל אחד.', 'Two superstars gain 2 popularity each.'),
    ('Fan Meet', 'מפגש מעריצים', 'רגיל', 'חד-פעמי', 'פופולריות', 'מתאבק אחד מקבל 2 פופולריות ו-10 מורל.', 'One superstar gains 2 popularity and 10 morale.'),
    ('Backstage Interview', 'ראיון מאחורי הקלעים', 'רגיל', 'חד-פעמי', 'פופולריות', 'מתאבק אחד בכרטיס השבוע מקבל 2 פופולריות ו-5 מורל.', 'One superstar on this week\'s card gains 2 popularity and 5 morale.'),
    ('Water Break', 'הפסקת מים', 'רגיל', 'חד-פעמי', 'בריאות', 'מתאבק אחד מקבל 10 סיבולת.', 'One superstar gains 10 stamina.'),
    ('Ice Pack', 'שקית קרח', 'רגיל', 'חד-פעמי', 'בריאות', 'שלושה מתאבקים מקבלים 5 סיבולת כל אחד.', 'Three superstars gain 5 stamina each.'),
    ('Quick Rehab', 'שיקום מהיר', 'רגיל', 'חד-פעמי', 'בריאות', 'פציעה של מתאבק אחד מתקצרת בשבוע.', 'One superstar\'s injury is one week shorter.'),
    ('Rest Day', 'יום מנוחה', 'רגיל', 'חד-פעמי', 'בריאות', 'מתאבק אחד לא מאבד סיבולת בקרב הבא שלו.', 'One superstar loses no stamina in their next match.'),
    ('Pep Talk', 'שיחת עידוד', 'רגיל', 'חד-פעמי', 'מורל', 'המורל של מתאבק אחד עולה ב-15.', 'One superstar\'s morale goes up 15.'),
    ('Team Lunch', 'ארוחת צוות', 'רגיל', 'חד-פעמי', 'מורל', 'כל הרוסטר מקבל 5 מורל.', 'The whole roster gains 5 morale.'),
    ('Local Sponsor', 'ספונסר מקומי', 'רגיל', 'חד-פעמי', 'כסף', '50 אלף דולר לתקציב.', '+$50K to the budget.'),
    ('Merch Table', 'דוכן מרצ\'נדייז', 'רגיל', 'חד-פעמי', 'כסף', '35 אלף דולר לתקציב.', '+$35K to the budget.'),
    ('Ticket Promo', 'מבצע כרטיסים', 'רגיל', 'חד-פעמי', 'קהל', 'הקהל בתוכנית הבאה גדל ב-5%.', 'Attendance at the next show grows by 5%.'),
    ('Street Team', 'צוות רחוב', 'רגיל', 'חד-פעמי', 'קהל', 'שכבת הפרסום של התוכנית הבאה עולה בדרגה אחת, בחינם.', 'The next show\'s advertising tier goes up one level for free.'),
    ('Cheap Seats Night', 'ערב כרטיסים זולים', 'רגיל', 'חד-פעמי', 'קהל', 'הקהל בתוכנית הבאה גדל ב-10%, ומחיר הכרטיס יורד ב-20%.', 'Next show: +10% attendance, ticket price -20%.'),
    ('Opening Pyro', 'פירוטכניקה בפתיחה', 'רגיל', 'חד-פעמי', 'קרבות', 'הקרב הפותח בשבוע הזה מקבל רבע כוכב נוסף.', 'This week\'s opener gets an extra quarter star.'),
    ('Entrance Upgrade', 'שדרוג כניסה', 'רגיל', 'חד-פעמי', 'קרבות', 'הקרב של מתאבק אחד בשבוע הזה מקבל רבע כוכב נוסף.', 'One superstar\'s match this week gets an extra quarter star.'),
    ('Video Package', 'קטע וידאו', 'רגיל', 'חד-פעמי', 'יריבויות', 'בפעם הבאה ששני היריבים נפגשים, היריבות עולה רמה בוודאות.', 'The next time the two rivals meet, the rivalry surely goes up a level.'),
    ('Scouting Tip', 'טיפ מהסקאוט', 'רגיל', 'חד-פעמי', 'גיוס', 'סקאוט נוסף לשבוע הזה.', 'One extra scout this week.'),
    ('Promo Coach', 'מאמן פרומו', 'רגיל', 'חד-פעמי', 'פיתוח', 'הפרומואים בשבוע הזה משפיעים ב-25% יותר.', 'Promos this week have 25% more effect.'),
    ('Extra Training', 'אימון נוסף', 'רגיל', 'חד-פעמי', 'פיתוח', 'מתאבק אחד מקבל ניסיון של שני אימונים, בחינם.', 'One superstar gets the XP of two training sessions, for free.'),
    ('Rumor Mill', 'טחנת שמועות', 'רגיל', 'חד-פעמי', 'התקפה', 'מתאבק אחד של יריב מאבד 10 מורל.', 'One rival superstar loses 10 morale.'),
    ('Flat Tire', 'פנצ\'ר', 'רגיל', 'חד-פעמי', 'התקפה', 'מתאבק אחד של יריב מאבד 10 סיבולת.', 'One rival superstar loses 10 stamina.'),
    ('Bad Review', 'ביקורת רעה', 'רגיל', 'חד-פעמי', 'התקפה', 'הקהל בתוכנית הבאה של יריב קטן ב-5%.', 'Attendance at a rival\'s next show drops by 5%.'),
    # ---- נדיר (18) ----
    ('Main Event Push', 'דחיפה לקרב הראשי', 'נדיר', 'חד-פעמי', 'קרבות', 'הקרב הראשי בשבוע הזה מקבל חצי כוכב נוסף.', 'This week\'s main event gets an extra half star.'),
    ('Steal The Show', 'לגנוב את ההצגה', 'נדיר', 'חד-פעמי', 'קרבות', 'קרב מידקארד אחד בשבוע הזה מקבל שלושה רבעי כוכב נוספים.', 'One midcard match this week gets an extra three quarters of a star.'),
    ('Double Duty', 'משמרת כפולה', 'נדיר', 'חד-פעמי', 'קרבות', 'מתאבק אחד יכול להתאבק פעמיים בתוכנית בלי קנס סיבולת נוסף.', 'One superstar can wrestle twice on a show with no extra stamina penalty.'),
    ('Title Hype', 'הייפ לתואר', 'נדיר', 'חד-פעמי', 'תארים', 'קרב תואר אחד בשבוע הזה מקבל חצי כוכב נוסף.', 'One title match this week gets an extra half star.'),
    ('Rivalry Spark', 'ניצוץ יריבות', 'נדיר', 'חד-פעמי', 'יריבויות', 'יריבות חדשה מתחילה ברמה 2.', 'A new rivalry starts at level 2.'),
    ('Heat Magnet', 'מגנט לשנאה', 'נדיר', 'חד-פעמי', 'יריבויות', 'מתאבק רע אחד מקבל 5 פופולריות, והיריבות שלו עולה ברמה.', 'One heel gains 5 popularity and their rivalry goes up a level.'),
    ('Underdog Story', 'סיפור האנדרדוג', 'נדיר', 'חד-פעמי', 'פופולריות', 'אם מתאבק טוב מנצח השבוע יריב בדרג גבוה ממנו, הוא מקבל 8 פופולריות.', 'If a face beats a higher-tier opponent this week, they gain 8 popularity.'),
    ('Fan Fest', 'פסטיבל מעריצים', 'נדיר', 'חד-פעמי', 'פופולריות', 'שלושה מתאבקים בכרטיס השבוע מקבלים 5 פופולריות כל אחד.', 'Three superstars on this week\'s card gain 5 popularity each.'),
    ('Merch Drop', 'השקת מרצ\'נדייז', 'נדיר', 'חד-פעמי', 'כסף', '150 אלף דולר לתקציב.', '+$150K to the budget.'),
    ('Medical Team', 'צוות רפואי', 'נדיר', 'חד-פעמי', 'בריאות', 'כל הפציעות ברוסטר מתקצרות בשבוע.', 'Every injury on the roster is one week shorter.'),
    ('Team Rally', 'עצרת צוות', 'נדיר', 'חד-פעמי', 'מורל', 'כל הרוסטר מקבל 15 מורל.', 'The whole roster gains 15 morale.'),
    ('Bonus Check', 'צ\'ק בונוס', 'נדיר', 'חד-פעמי', 'מורל', 'בקשה פתוחה של מתאבק אחד נסגרת בחינם, כאילו מילאת אותה.', 'One superstar\'s open request is resolved for free, as if fulfilled.'),
    ('Contract Extension', 'הארכת חוזה', 'נדיר', 'חד-פעמי', 'גיוס', 'חוזה של אגדה או סוכן חופשי מתארך ב-5 שבועות.', 'A Legend\'s or Free Agent\'s contract is extended by 5 weeks.'),
    ('Contract Leverage', 'מנוף בחוזה', 'נדיר', 'חד-פעמי', 'גיוס', 'חידוש חוזה של מתאבק אחד זול ב-20%.', 'Re-signing one superstar costs 20% less.'),
    ('Talent Showcase', 'ערב כישרונות', 'נדיר', 'חד-פעמי', 'גיוס', 'שני סקאוטים נוספים לשבוע הזה.', 'Two extra scouts this week.'),
    ('Surprise Return', 'חזרה מפתיעה', 'נדיר', 'חד-פעמי', 'גיוס', 'כוכב עבר אקראי מופיע השבוע במאגר, בלי צורך בסקאוטים.', 'A random Former Star appears in the pool this week, no scouts needed.'),
    ('Mic Lesson', 'שיעור מיקרופון', 'נדיר', 'חד-פעמי', 'פיתוח', 'מתאבק אחד עם מגמת שיפור עולה כוכב שלם במיקרופון.', 'One superstar with mic growth gains a full mic star.'),
    ('Insider Tip', 'טיפ מבפנים', 'נדיר', 'חד-פעמי', 'התקפה', 'רואים השבוע את הקרב הראשי של יריב אחד לפני שנועלים את הכרטיס.', 'See one rival\'s main event this week before you lock your card.'),
    # ---- אפי (12) ----
    ('TV Deal', 'עסקת טלוויזיה', 'אפי', 'פועל 4 שבועות', 'כסף', 'ההכנסות מכל תוכנית גדלות ב-10%.', 'Revenue from every show grows by 10%.'),
    ('Streaming Deal', 'עסקת סטרימינג', 'אפי', 'פועל 4 שבועות', 'כסף', '75 אלף דולר נוספים מכל תוכנית.', '+$75K from every show.'),
    ('Training Facility', 'מתקן אימונים', 'אפי', 'פועל 6 שבועות', 'פיתוח', 'כל הרוסטר צובר ניסיון ב-25% יותר.', 'The whole roster earns 25% more XP.'),
    ('Hype Machine', 'מכונת הייפ', 'אפי', 'פועל 4 שבועות', 'פיתוח', 'כל הפרומואים משפיעים ב-50% יותר.', 'All promos have 50% more effect.'),
    ('Physio Room', 'חדר פיזיותרפיה', 'אפי', 'פועל 4 שבועות', 'בריאות', 'הסיבולת ברוסטר מתאוששת ב-50% מהר יותר.', 'Roster stamina recovers 50% faster.'),
    ('Scout Network', 'רשת סקאוטים', 'אפי', 'פועל 4 שבועות', 'גיוס', 'שני סקאוטים נוספים בכל שבוע.', 'Two extra scouts every week.'),
    ('Roster Depth', 'עומק רוסטר', 'אפי', 'פועל 6 שבועות', 'גיוס', 'אפשר להחזיק 3 מתאבקים יותר מהמגבלה.', 'You can hold 3 superstars over the roster limit.'),
    ('Hot Crowd', 'קהל לוהט', 'אפי', 'חד-פעמי', 'קרבות', 'כל הקרבות בתוכנית הזו מקבלים חצי כוכב נוסף.', 'Every match on this show gets an extra half star.'),
    ('Sold Out', 'כל הכרטיסים נמכרו', 'אפי', 'חד-פעמי', 'קהל', 'התוכנית הזו מתמלאת עד הקיבולת המלאה של האולם.', 'This show sells out to the venue\'s full capacity.'),
    ('Rivalry Week', 'שבוע היריבויות', 'אפי', 'חד-פעמי', 'יריבויות', 'כל יריבות בכרטיס השבוע עולה ברמה.', 'Every rivalry on this week\'s card goes up a level.'),
    ('Contender Tournament', 'טורניר מתמודדים', 'אפי', 'חד-פעמי', 'תארים', 'קרב על המקום הראשון בתור לתואר: כוכב שלם נוסף, והמנצח מקבל 10 פופולריות.', 'A #1 contender match: a full extra star, and the winner gains 10 popularity.'),
    ('Contract Freeze', 'הקפאת חוזים', 'אפי', 'פועל 2 שבועות', 'התקפה', 'יריב אחד לא יכול להחתים סוכנים חופשיים.', 'One rival cannot sign free agents.'),
    # ---- אגדי (6) ----
    ('Legend Return', 'שובה של אגדה', 'אגדי', 'חד-פעמי', 'גיוס', 'חותמים אגדה אחת בחינם.', 'Sign one Legend for free.'),
    ('Crowd Favorite', 'אהוב הקהל', 'אגדי', 'פועל 4 שבועות', 'פופולריות', 'הפופולריות של מתאבק אחד עולה ל-90.', 'One superstar\'s popularity rises to 90.'),
    ('Main Event Magic', 'קסם של קרב ראשי', 'אגדי', 'חד-פעמי', 'קרבות', 'הקרב הראשי בשבוע הזה מקבל כוכב וחצי נוספים.', 'This week\'s main event gets 1.5 extra stars.'),
    ('Miracle Recovery', 'החלמה מופלאה', 'אגדי', 'חד-פעמי', 'בריאות', 'כל הפציעות ברוסטר נרפאות מיד.', 'Every injury on the roster heals at once.'),
    ('Corporate Raid', 'פשיטה תאגידית', 'אגדי', 'חד-פעמי', 'התקפה', 'לוקחים 200 אלף דולר מהתקציב של יריב.', 'Take $200K from a rival\'s budget.'),
    ('Blockbuster Trade', 'טרייד ענק', 'אגדי', 'חד-פעמי', 'גיוס', 'טרייד אחד מול מותג של המחשב עובר בלי אישור שלו, בתנאי שהערכים קרובים.', 'One trade with a computer brand goes through without its approval, if the values are close.'),
]

gms = [{
    'id': f'G{i + 1:02d}', 'name': g[0], 'nameHe': g[1], 'family': g[2],
    'card': g[3], 'cardHe': g[4], 'use': g[5], 'useHe': USE[g[5]], 'useDetail': g[6],
    'effect': g[7], 'gameChanger': g[8],
    'familyEn': FAMILY_EN[g[2]], 'useDetailEn': USE_EN[g[6]], 'effectEn': EFFECT_EN[g[3]],
} for i, g in enumerate(GMS)]
brand_cards = [{'id': f'B{i + 1:02d}', 'brand': b[0], 'name': b[1], 'nameHe': b[2], 'useDetail': b[3], 'effect': b[4], 'gameChanger': b[5], 'useDetailEn': USE_EN[b[3]], 'effectEn': EFFECT_EN[b[1]]} for i, b in enumerate(BRAND_CARDS)]
json.dump(brand_cards, open(os.path.join(HERE, 'brand_cards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
shop = [{'id': f'C{i + 1:02d}', 'name': c[0], 'nameHe': c[1], 'rarity': c[2], 'use': c[3], 'category': c[4], 'effect': c[5],
         'rarityEn': RARITY_EN[c[2]], 'useEn': SHOP_USE_EN[c[3]], 'categoryEn': CATEGORY_EN[c[4]], 'effectEn': c[6]} for i, c in enumerate(SHOP)]
json.dump(gms, open(os.path.join(HERE, 'gms.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(shop, open(os.path.join(HERE, 'shop_cards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

counts = {k: sum(1 for g in gms if g['use'] == k) for k in USE}
n1 = sum(1 for g in gms if g['useDetail'] == 'פעם בעונה')
n2 = sum(1 for g in gms if g['useDetail'] == 'פעמיים בעונה')
n3 = sum(1 for g in gms if g['useDetail'] == '3 פעמים בעונה')
gc = sum(1 for g in gms if g['gameChanger'])

gm_rows = ['| # | מנהל | משפחה | קלף בלעדי | שימוש | מה הוא עושה |', '| --- | --- | --- | --- | --- | --- |']
for g in gms:
    star = ' **(משנה משחק)**' if g['gameChanger'] else ''
    kind = 'קבוע' if g['use'] == 'passive' else g['useDetail']
    gm_rows.append(f"| {g['id']} | {g['nameHe']} ({g['name']}) | {g['family']} | {g['cardHe']} ({g['card']}){star} | {kind} | {g['effect']} |")

brand_rows = ['| תוכנית | קלף | שימוש | מה הוא עושה |', '| --- | --- | --- | --- |']
for b in brand_cards:
    star = ' **(משנה משחק)**' if b['gameChanger'] else ''
    brand_rows.append(f"| {b['brand']} | {b['nameHe']} ({b['name']}){star} | {b['useDetail']} | {b['effect']} |")

shop_rows = []
for r in ('רגיל', 'נדיר', 'אפי', 'אגדי'):
    cs = [c for c in shop if c['rarity'] == r]
    shop_rows.append(f"### {r} ({len(cs)})\n\n| # | קלף | קטגוריה | שימוש | מה הוא עושה |\n| --- | --- | --- | --- | --- |")
    for c in cs:
        shop_rows.append(f"| {c['id']} | {c['nameHe']} ({c['name']}) | {c['category']} | {c['use']} | {c['effect']} |")
    shop_rows.append('')

doc = f'''---
title: קלפי הכוח
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: טיוטה, המספרים לפי מודל עבודה
lead: קלף בלעדי לכל אחד מ-20 המנהלים, כמו במקור: רובם מוגבלים לפעם עד 3 פעמים בעונה, ורק {counts['passive']} קבועים עם יתרון קטן. {gc} מהם משני משחק, כדי שבחירת המנהל תהיה החלטה קשה.
---

## בקצרה

- **כמו במקור:** לכל מנהל קלף בלעדי מאחת מארבע המשפחות (כלכלה, יריבויות, התאוששות, התקפה). בנוסף, לכל תוכנית שני קלפים ייעודיים, ויש חנות קלפים.
- **מגוון בשימוש (החלטה 44):**
  - **מוגבל:** {n1} קלפים פעם בעונה (החזקים ביותר), {n2} פעמיים בעונה, ו-{n3} שלוש פעמים בעונה.
  - **קבוע:** רק {counts['passive']} קלפים, שנותנים יתרון קטן לאורך כל העונה ולא מכריעים לבד.
- **משני משחק:** {gc} קלפים חזקים במיוחד, שכל אחד מהם מכתיב סגנון משחק שלם. לכל משחק מנהל יש יתרון אמיתי, כך שאין "בחירה נכונה" אחת.

> [!לאמת]
> כל המספרים (אחוזים, שבועות, סכומים, מחירים בחנות) הם מודל עבודה. מכיילים אותם במחקר המספרים ובסימולטור האיזון.

## הקלפים הבלעדיים של המנהלים

{chr(10).join(gm_rows)}

## איך בוחרים מנהל

| סגנון משחק | מנהלים שמתאימים |
| --- | --- |
| בונה כוכבים מבפנים | הדוג'ו (יוקי טנאבה), זרקור (פליקס אוקורו), לשון זהב (תאו לנקסטר) |
| סיפורים ויריבויות | ללבות את האש (ביג אל מונטגיו), דם רע (נדיה רחימי), קרב חשבונות (אינגריד סולברג) |
| כסף ואגדות | רשת האגדות (סופיה בלוצ'י), שער הזהב (ויקטוריה סטרלינג) |
| רוסטר עמיד לעונה ארוכה | רפואת ספורט (ד"ר הלנה ווס), ארוחה משפחתית (מאמא לוצ'יה) |
| פוגע ביריבים | חטיפה (סרינה בלקוול), מידע פנימי (הנציב), מארב מאחורי הקלעים (דנטה קורבינו) |

## הקלפים של התוכניות

לכל תוכנית שני קלפים ייעודיים, לפי האופי שלה, כמו קלפי המותגים במקור [[לאמת]]. מי שמנהל את התוכנית מקבל אותם בתחילת כל עונה, בנוסף לקלף של המנהל. כך גם בחירת התוכנית משפיעה על סגנון המשחק.

{chr(10).join(brand_rows)}

## חנות הקלפים

קונים בתקציב (החלטה 50). {len(shop)} קלפים ב-11 קטגוריות ובארבע רמות נדירות: רגיל, נדיר, אפי ואגדי. רוב הקלפים חד-פעמיים, כמה פועלים 2–6 שבועות, ואף אחד לא פועל כל העונה. בכל שבוע החנות מציגה מבחר מתחלף [[לאמת]].

{chr(10).join(shop_rows)}
'''
open(os.path.join(ROOT, 'docs', 'cards.md'), 'w', encoding='utf-8').write(doc)
print(len(brand_cards), 'קלפי תוכניות;', len(gms), 'מנהלים;', counts, 'פעם/פעמיים/3:', n1, n2, n3, 'משני משחק:', gc)
