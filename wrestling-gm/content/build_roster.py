"""בונה את נתוני הדמויות של LWF: 300 מתאבקים ו-20 מנהלים.
פלט: content/roster.json, content/gms.json, docs/roster.md
הטווחים המספריים מסומנים כהערכה עד מחקר המספרים של המקור (החלטה 23).
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
random.seed(2026)

# ---------- שכבות (החלטה 42) ----------
# pool: active = בדראפט; legend/former/free/local = גיוס במהלך העונה
TIERS = [
    # key, he, pool, count, pop, ring, promo, salary(k$/season), scout_level
    ('superstar', 'כוכב על', 'active', 20, (85, 98), (8, 10), (70, 98), (200, 260), None),
    ('star', 'כוכב', 'active', 35, (70, 86), (6, 8), (55, 90), (140, 210), None),
    ('midcard', 'מידקארד', 'active', 55, (50, 72), (4, 6), (40, 80), (80, 140), None),
    ('rising', 'כוכב עולה', 'active', 30, (45, 65), (3, 5), (40, 80), (60, 110), None),
    ('prospect', 'צעיר בפיתוח', 'active', 40, (25, 48), (1, 3), (20, 70), (30, 70), None),
    ('legend', 'אגדה', 'legend', 30, (85, 99), (8, 10), (70, 99), (300, 450), None),
    ('former', 'כוכב עבר', 'former', 30, (55, 80), (6, 9), (50, 85), (120, 220), (3, 5)),
    ('free', 'סוכן חופשי', 'free', 30, (35, 65), (3, 6), (30, 75), (60, 150), (1, 3)),
    ('local', 'כישרון מקומי', 'local', 30, (5, 25), (1, 2), (10, 50), (10, 30), (0, 0)),
]
WOMEN_SHARE = 0.35

CLASSES = [('Giant', 'ענק'), ('Cruiser', 'קל-משקל'), ('Bruiser', 'מכתש'), ('Fighter', 'לוחם'), ('Specialist', 'מומחה')]
CLASS_W_MEN = [12, 18, 22, 26, 22]
CLASS_W_WOMEN = [5, 25, 15, 30, 25]

# ---------- שמות בעבודת יד לשכבות הבכירות ----------
SUPERSTARS_M = [
    ('Dominic Vale', 'דומיניק וייל'), ('Colossus', 'קולוסוס'), ('Marcus Blackthorne', 'מרקוס בלקת\'ורן'),
    ('Ryker Stormvale', 'רייקר סטורמוויל'), ('Draven Holt', 'דרייבן הולט'), ('King Malachi', 'קינג מלאכי'),
    ('Saint Lucien', 'סיינט לוסיאן'), ('Kenzo Arata', 'קנזו אראטה'), ('El Fantasma Rojo', 'אל פנטסמה רוחו'),
    ('Thorin Ashgrave', 'ת\'ורין אשגרייב'), ('Cassian Rourke', 'קסיאן רורק'), ('Halvard Brask', 'הלבארד בראסק'),
    ('Zion Okoye', 'ציון אוקויה'),
]
SUPERSTARS_W = [
    ('Seraphina Lux', 'סרפינה לוקס'), ('Aurora Vance', 'אורורה ואנס'), ('Kaida Mori', 'קאידה מורי'),
    ('Nyx Delacroix', 'ניקס דלקרואה'), ('Ophelia Thorn', 'אופליה ת\'ורן'), ('Ximena Cruz', 'חימנה קרוז'),
    ('Freya Ironheart', 'פרייה איירונהארט'),
]
LEGENDS_M = [
    ('Harlan Crowe', 'הרלן קרואו'), ('Earl Bramwell', 'ארל ברמוול'), ('"Iron" Mike Dellacroce', '"איירון" מייק דלקרוצ\'ה'),
    ('Thurston Hale', 'ת\'רסטון הייל'), ('Rex Malvern', 'רקס מלוורן'), ('Angus Macrae', 'אנגוס מקריי'),
    ('Señor Tormenta', 'סניור טורמנטה'), ('Big Jim Tolliver', 'ביג ג\'ים טוליבר'), ('Duke Ravensworth', 'דיוק רייבנסוורת\''),
    ('Sergei Dragomir', 'סרגיי דרגומיר'), ('Tank Abernathy', 'טנק אברנתי'), ('Lord Percival Ashby', 'לורד פרסיבל אשבי'),
    ('Kaz Morita', 'קאז מוריטה'), ('Johnny Satin', 'ג\'וני סאטן'), ('Bishop Kincaid', 'בישופ קינקייד'),
    ('Rocky Tremont', 'רוקי טרמונט'), ('Makoa Kealoha', 'מקואה קיאלוהה'), ('Cyclone Diaz', 'סייקלון דיאז'),
    ('Gentleman Graves', 'ג\'נטלמן גרייבס'), ('Wildcat Monroe', 'ויילדקאט מונרו'),
]
LEGENDS_W = [
    ('Glory Bellamy', 'גלורי בלמי'), ('Roxy Lamarr', 'רוקסי למאר'), ('Queen Magdalena', 'קווין מגדלנה'),
    ('Jewel Carrington', 'ג\'ול קרינגטון'), ('Misty Holloway', 'מיסטי הולוואי'), ('Dolores Ibarra', 'דולורס איבארה'),
    ('Tanya Kruger', 'טניה קרוגר'), ('Bonnie Ryder', 'בוני ריידר'), ('Hana Shimizu', 'האנה שימיזו'),
    ('Electra Vaughn', 'אלקטרה וון'),
]

# ---------- רשימות שמות לשאר השכבות ----------
FIRST_M = [l.split('|') for l in '''Adrian|אדריאן Axel|אקסל Beau|בו Bram|בראם Caden|קיידן Callum|קאלום Cassius|קסיוס Colt|קולט Conrad|קונרד Cyrus|סיירוס Dante|דנטה Darius|דריוס Declan|דקלן Dorian|דוריאן Elijah|אלייג'ה Emmett|אמט Ezra|עזרא Felix|פליקס Gideon|גדעון Grady|גריידי Hector|הקטור Hugo|הוגו Idris|אידריס Isaac|אייזק Jace|ג'ייס Jasper|ג'ספר Jonah|ג'ונה Julian|ג'וליאן Knox|נוקס Lazlo|לזלו Leon|ליאון Lucian|לוסיאן Magnus|מגנוס Malcolm|מלקולם Marco|מרקו Mateo|מטאו Milo|מיילו Nico|ניקו Nolan|נולאן Omar|עומאר Orion|אוריון Oscar|אוסקר Pierce|פירס Quentin|קוונטין Rafael|רפאל Reid|ריד Remy|רמי Rhett|רט Sawyer|סוייר Silas|סיילס Soren|סורן Tate|טייט Thaddeus|תדיאוס Theo|תאו Tobias|טוביאס Tristan|טריסטן Ulysses|יוליסס Vance|ואנס Victor|ויקטור Zane|זיין Zeke|זיק Anton|אנטון Boris|בוריס Kenji|קנג'י Hiro|הירו Mateus|מתאוס Luca|לוקה Dmitri|דמיטרי Rocco|רוקו Santiago|סנטיאגו Diego|דייגו Tariq|טאריק Kwame|קוואמה Sione|סיונה Tane|טאנה Bastian|בסטיאן Ivo|איבו'''.split()]
FIRST_W = [l.split('|') for l in '''Ava|אווה Blair|בלייר Brynn|ברין Camila|קמילה Cora|קורה Dahlia|דליה Eden|עדן Elena|אלנה Esme|אסמה Gemma|ג'מה Harlow|הרלו Imogen|אימוג'ן Ingrid|אינגריד Isla|איסלה Ivy|אייבי Jada|ג'יידה Juno|ג'ונו Kira|קירה Leona|ליאונה Mara|מארה Marisol|מריסול Mila|מילה Nadia|נדיה Nova|נובה Opal|אופל Paloma|פלומה Quinn|קווין Reina|ריינה Rosalind|רוזלינד Saskia|סאסקיה Selene|סלין Sienna|סיינה Talia|טליה Tamsin|טמסין Valentina|ולנטינה Vera|ורה Wren|רן Yara|יארה Zara|זארה Keiko|קייקו Aiko|אייקו Noelani|נואלאני Priya|פריה Ayla|איילה'''.split()]
LAST = [l.split('|') for l in '''Ashcroft|אשקרופט Blackwood|בלקווד Bracken|ברקן Cardell|קרדל Castellan|קסטלן Corwin|קורווין Crane|קריין Draven|דרייבן Duskmore|דאסקמור Easton|איסטון Falk|פאלק Fenwick|פנוויק Garrow|גארו Grimsby|גרימסבי Halvorsen|הלבורסן Harrowgate|הארוגייט Hawthorne|הות'ורן Ironside|איירונסייד Jarrow|ג'ארו Kessler|קסלר Kingsley|קינגסלי Kord|קורד Lockridge|לוקרידג' Lowell|לואל Marchetti|מרקטי Mercer|מרסר Moreau|מורו Navarro|נבארו Northcott|נורתקוט Okafor|אוקפור Oduya|אודויה Pellegrino|פלגרינו Petrov|פטרוב Quill|קוויל Radcliffe|רדקליף Ravenscroft|רייבנסקרופט Salazar|סלזר Sato|סאטו Saxon|סקסון Sorensen|סורנסן Strand|סטרנד Sutter|סאטר Tremaine|טרמיין Ulrich|אולריך Valdez|ולדז Vasquez|ואסקז Vex|וקס Voss|ווס Wakefield|וייקפילד Warrick|וואריק Whitlock|ויטלוק Wolfe|וולף Wynter|וינטר York|יורק Zamora|זמורה Zell|זל Baptiste|בטיסט Boone|בון Brandt|ברנדט Cade|קייד Calder|קלדר Colton|קולטון Dacosta|דקוסטה Drummond|דראמונד Ellery|אלרי Falcone|פלקונה Fairbanks|פיירבנקס Hatcher|האצ'ר Hunt|האנט Ingram|אינגרם Jansen|יאנסן Keller|קלר Langston|לנגסטון Larkin|לארקין Lyle|לייל Madigan|מדיגן Malone|מאלון Mendez|מנדז Novak|נובאק Oakes|אוקס Ortega|אורטגה Pike|פייק Prescott|פרסקוט Quinlan|קווינלן Rhys|ריס Rook|רוק Santos|סנטוס Shaw|שו Sinclair|סינקלר Slade|סלייד Tanaka|טנאקה Torres|טורס Ventura|ונטורה Wilder|ויילדר Winslow|וינסלו Yates|ייטס Zeller|זלר Kovac|קובאץ' Lindqvist|לינדקוויסט Achterberg|אכטרברג Mbeki|מבקי Adebayo|אדבאיו Takeda|טאקדה Kuroda|קורודה Rinaldi|רינלדי Ferraro|פרארו Duval|דובאל Laurent|לורן Varga|וארגה Brennan|ברנן Gallagher|גלאגר Doyle|דויל Rowley|ראולי Stroud|סטראוד Vantress|ונטרס Moretti|מורטי Okonkwo|אוקונקוו Lindgren|לינדגרן Petrakis|פטרקיס Szabo|סאבו Haddad|חדאד Castillo|קסטיו Fontaine|פונטיין Grieve|גריב Holm|הולם'''.split()]

HOMETOWNS = [l.split('|') for l in 'Chicago|שיקגו;Houston|יוסטון;Detroit|דטרויט;Toronto|טורונטו;Mexico City|מקסיקו סיטי;London|לונדון;Manchester|מנצ\'סטר;Glasgow|גלזגו;Dublin|דבלין;Tokyo|טוקיו;Osaka|אוסקה;Sydney|סידני;Auckland|אוקלנד;Lagos|לאגוס;Berlin|ברלין;Stockholm|שטוקהולם;Rome|רומא;Madrid|מדריד;Paris|פריז;São Paulo|סאו פאולו;San Juan|סן חואן;Las Vegas|לאס וגאס;Philadelphia|פילדלפיה;Atlanta|אטלנטה;Tel Aviv|תל אביב;Honolulu|הונולולו;Nashville|נאשוויל;Seoul|סיאול;Cardiff|קרדיף;Montreal|מונטריאול'.split(';')]

TAG_M = [l.split('|') for l in '''Steel Syndicate|סטיל סינדיקט The Night Raiders|הנייט ריידרז Brute Force|ברוט פורס Thunderhearts|ת'אנדרהארטס Lone Wolves|לון וולבס Concrete Kings|קונקריט קינגז The Outriders|האאוטריידרז Live Wire|לייב וואייר Gold Standard|גולד סטנדרט Crimson Order|קרימזון אורדר The Ironsides|האיירונסיידז The Vanguard|הוונגארד Dust Devils|דאסט דווילז Twin Turbines|טווין טורביינז The Bounty|הבאונטי Polar Front|פולאר פרונט Hellhounds|הלהאונדז The Foundry|הפאונדרי Royal Guard|רויאל גארד The Collective|הקולקטיב'''.split('\n') if False] or [
    ('Steel Syndicate', 'סטיל סינדיקט'), ('The Night Raiders', 'הנייט ריידרז'), ('Brute Force', 'ברוט פורס'),
    ('Thunderhearts', 'ת\'אנדרהארטס'), ('Lone Wolves', 'לון וולבס'), ('Concrete Kings', 'קונקריט קינגז'),
    ('The Outriders', 'האאוטריידרז'), ('Live Wire', 'לייב וואייר'), ('Gold Standard', 'גולד סטנדרט'),
    ('Crimson Order', 'קרימזון אורדר'), ('The Ironsides', 'האיירונסיידז'), ('The Vanguard', 'הוונגארד'),
    ('Dust Devils', 'דאסט דווילז'), ('Twin Turbines', 'טווין טורביינז'), ('The Bounty', 'הבאונטי'),
    ('Polar Front', 'פולאר פרונט'), ('Hellhounds', 'הלהאונדז'), ('The Foundry', 'הפאונדרי'),
    ('Royal Guard', 'רויאל גארד'), ('The Collective', 'הקולקטיב'),
]
TAG_W = [
    ('Velvet Fury', 'ולווט פיורי'), ('Neon Rebels', 'ניאון רבלז'), ('Diamond Edge', 'דיימונד אדג\''),
    ('Midnight Bloom', 'מידנייט בלום'), ('Shieldmaidens', 'שילדמיידנז'), ('Sugar & Spite', 'שוגר אנד ספייט'),
    ('Black Orchid', 'בלאק אורקיד'), ('Firebrands', 'פיירברנדז'), ('Storm Sirens', 'סטורם סיירנז'),
    ('Glass Hearts', 'גלאס הארטס'),
]

# ---------- תיאורים ----------
DESC = {
    'Giant': ('ענק שמכריע במשקל ובכוח, כל צעד שלו מרעיד את הזירה', 'A towering giant who wins with sheer size and power'),
    'Cruiser': ('מהיר ואווירי, מעופף מהחבלים ומפתיע בזריזות', 'A fast high-flyer who strikes from the ropes'),
    'Bruiser': ('קשוח וגס, מכות כבדות ואין לו בעיה לספוג', 'A hard-hitting brawler who can take as much as he gives'),
    'Fighter': ('טכני ומדויק, שולט בקרב על הקרקע ובהכנעות', 'A precise technician who controls the mat'),
    'Specialist': ('ורסטילי ובלתי צפוי, מתאים את עצמו לכל יריב', 'A versatile wildcard who adapts to any opponent'),
}
TIER_LINE = {
    'superstar': ('פני הליגה, מוכר לכל מעריץ.', 'A face of the league.'),
    'star': ('כוכב מבוסס שתמיד קרוב לתואר.', 'An established star always near the title picture.'),
    'midcard': ('לב הכרטיס, אמין בכל משבצת.', 'The reliable heart of the card.'),
    'rising': ('בעלייה חדה, הקהל מתחיל להאמין בו.', 'On the rise, and the crowd is buying in.'),
    'prospect': ('צעיר עם פוטנציאל, עדיין לומד את המקצוע.', 'A young prospect still learning the craft.'),
    'legend': ('אגדה של LWF. יקר וזמין לזמן מוגבל.', 'An LWF legend. Expensive, and only for a short stint.'),
    'former': ('כוכב עבר שעדיין יודע להביא קהל. נמצא רק דרך סקאוטים.', 'A former star who still draws. Found only by scouts.'),
    'free': ('סוכן חופשי שמחפש הזדמנות.', 'A free agent looking for a break.'),
    'local': ('כישרון מקומי, זול ופנוי בכל שבוע.', 'Local talent, cheap and available every week.'),
}

DESC_F = {
    'Giant': ('ענקית שמכריעה במשקל ובכוח, כל צעד שלה מרעיד את הזירה', 'A towering giant who wins with sheer size and power'),
    'Cruiser': ('מהירה ואווירית, מעופפת מהחבלים ומפתיעה בזריזות', 'A fast high-flyer who strikes from the ropes'),
    'Bruiser': ('קשוחה וגסה, מכות כבדות ואין לה בעיה לספוג', 'A hard-hitting brawler who can take as much as she gives'),
    'Fighter': ('טכנית ומדויקת, שולטת בקרב על הקרקע ובהכנעות', 'A precise technician who controls the mat'),
    'Specialist': ('ורסטילית ובלתי צפויה, מתאימה את עצמה לכל יריבה', 'A versatile wildcard who adapts to any opponent'),
}
TIER_LINE_F = {
    'superstar': ('פני הליגה, מוכרת לכל מעריץ.', 'A face of the league.'),
    'star': ('כוכבת מבוססת שתמיד קרובה לתואר.', 'An established star always near the title picture.'),
    'midcard': ('לב הכרטיס, אמינה בכל משבצת.', 'The reliable heart of the card.'),
    'rising': ('בעלייה חדה, הקהל מתחיל להאמין בה.', 'On the rise, and the crowd is buying in.'),
    'prospect': ('צעירה עם פוטנציאל, עדיין לומדת את המקצוע.', 'A young prospect still learning the craft.'),
    'legend': ('אגדה של LWF. יקרה וזמינה לזמן מוגבל.', 'An LWF legend. Expensive, and only for a short stint.'),
    'former': ('כוכבת עבר שעדיין יודעת להביא קהל. נמצאת רק דרך סקאוטים.', 'A former star who still draws. Found only by scouts.'),
    'free': ('סוכנת חופשית שמחפשת הזדמנות.', 'A free agent looking for a break.'),
    'local': ('כישרון מקומי, זולה ופנויה בכל שבוע.', 'Local talent, cheap and available every week.'),
}

used_full, used_last = set(), {}


def gen_name(gender):
    firsts = FIRST_W if gender == 'F' else FIRST_M
    for _ in range(500):
        f = random.choice(firsts)
        l = random.choice(LAST)
        full = f'{f[0]} {l[0]}'
        if full in used_full or used_last.get(l[0], 0) >= 2:
            continue
        used_full.add(full)
        used_last[l[0]] = used_last.get(l[0], 0) + 1
        return full, f'{f[1]} {l[1]}'
    raise RuntimeError('out of names')


def rnd(rng):
    return random.randint(*rng)


wrestlers = []
roles_cycle = {}


def make(tier, gender, name=None):
    key, he, pool, _, pop, ring, promo, sal, scout = tier
    if name is None:
        name = gen_name(gender)
    else:
        used_full.add(name[0])
    weights = CLASS_W_WOMEN if gender == 'F' else CLASS_W_MEN
    cls = random.choices(CLASSES, weights=weights)[0]
    # צדדים מאוזנים בכל שכבה ומגדר
    k = (key, gender)
    roles_cycle[k] = roles_cycle.get(k, 0) + 1
    role = ('Face', 'טוב') if roles_cycle[k] % 2 else ('Heel', 'רע')
    w = {
        'id': f'W{len(wrestlers) + 1:03d}',
        'name': name[0], 'nameHe': name[1],
        'gender': gender,
        'tier': key, 'tierHe': he, 'pool': pool,
        'class': cls[0], 'classHe': cls[1],
        'role': role[0], 'roleHe': role[1],
        'popularity': rnd(pop), 'ringLevel': rnd(ring), 'promo': rnd(promo),
        'salary': rnd(sal) * 1000,
        'hometown': None, 'hometownHe': None,
        'age': None,
        'potential': None,
        'scoutLevel': rnd(scout) if scout else None,
        'contractWeeks': None,
        'tagTeam': None, 'tagTeamHe': None,
        'desc': None, 'descEn': None,
    }
    ht = random.choice(HOMETOWNS)
    w['hometown'], w['hometownHe'] = ht
    w['age'] = {'prospect': (19, 24), 'rising': (22, 28), 'legend': (45, 62), 'former': (36, 48), 'local': (20, 35)}.get(key, (26, 40))
    w['age'] = random.randint(*w['age'])
    if key in ('prospect', 'rising'):
        w['potential'] = random.randint(3, 5) if key == 'rising' else random.randint(1, 5)
    if key == 'legend':
        w['contractWeeks'] = random.choice([4, 6, 8, 10, 12])
    elif key in ('former', 'free', 'local'):
        w['contractWeeks'] = random.choice([8, 12, 16, 20, 25])
    d = (DESC_F if gender == 'F' else DESC)[cls[0]]
    t = (TIER_LINE_F if gender == 'F' else TIER_LINE)[key]
    w['desc'] = f'{d[0]}. {t[0]}'
    w['descEn'] = f'{d[1]}. {t[1]}'
    wrestlers.append(w)
    return w


for tier in TIERS:
    key, count = tier[0], tier[3]
    n_w = round(count * WOMEN_SHARE)
    n_m = count - n_w
    hand_m = {'superstar': SUPERSTARS_M, 'legend': LEGENDS_M}.get(key, [])
    hand_w = {'superstar': SUPERSTARS_W, 'legend': LEGENDS_W}.get(key, [])
    for i in range(n_m):
        make(tier, 'M', hand_m[i] if i < len(hand_m) else None)
    for i in range(n_w):
        make(tier, 'F', hand_w[i] if i < len(hand_w) else None)

# ---------- צמדים: מהפעילים, לא מכוכבי העל ----------
def assign_tags(gender, names):
    pool = [w for w in wrestlers if w['pool'] == 'active' and w['gender'] == gender and w['tier'] in ('star', 'midcard', 'rising', 'prospect') and not w['tagTeam']]
    random.shuffle(pool)
    for team in names:
        a, b = pool.pop(), pool.pop()
        b['role'], b['roleHe'] = a['role'], a['roleHe']  # צמד באותו צד
        for x in (a, b):
            x['tagTeam'], x['tagTeamHe'] = team


assign_tags('M', TAG_M)
assign_tags('F', TAG_W)

# ---------- 20 מנהלים, לכל אחד קלף בלעדי (ארבע משפחות, לפי המקור) ----------
GMS = [
    ('Victoria Sterling', 'ויקטוריה סטרלינג', 'כלכלה', 'Golden Gate', 'שער הזהב', 'הכנסות הקהל כפולות לשבוע אחד.'),
    ('Raymond Kessington', 'ריימונד קסינגטון', 'כלכלה', 'Open Checkbook', 'פנקס פתוח', 'כל הקרבות בחינם לשבוע אחד. פעמיים בעונה.'),
    ('Delphine Ortiz', 'דלפין אורטיז', 'כלכלה', 'Prime Time Deal', 'עסקת פריים טיים', 'בונוסי הלוגיסטיקה כפולים לשבוע אחד.'),
    ('Marcus Whitfield', 'מרקוס ויטפילד', 'כלכלה', 'Bargain Bin', 'מבצע סוף עונה', 'קלפים בחנות בחינם, ושתי יחידות בכל קנייה. פעמיים בעונה.'),
    ('Sofia Bellucci', 'סופיה בלוצ\'י', 'כלכלה', 'Legend Network', 'רשת האגדות', 'האגדה הראשונה שנחתמת השבוע בחינם.'),
    ('Big Al Montague', 'ביג אל מונטגיו', 'יריבויות', 'Fan The Flames', 'ללבות את האש', 'כל היריבויות הפעילות עולות בשתי רמות. פעמיים בעונה.'),
    ('Nadia Rahimi', 'נדיה רחימי', 'יריבויות', 'Bad Blood', 'דם רע', 'יריבות אחת קופצת ישר לרמה 4.'),
    ('Theo Lancaster', 'תאו לנקסטר', 'יריבויות', 'Mic Drop', 'נפילת המיקרופון', 'פרומואים בחינם והתוצאות שלהם כפולות לשבוע אחד.'),
    ('Ingrid Solberg', 'אינגריד סולברג', 'יריבויות', 'Grudge Match', 'קרב חשבונות', 'קרב יריבות השבוע מקבל בונוס ציון גבוה.'),
    ('Felix Okoro', 'פליקס אוקורו', 'יריבויות', 'Spotlight', 'זרקור', 'מתאבק אחד מקבל 10 פופולריות.'),
    ('Dr. Helena Voss', 'ד"ר הלנה ווס', 'התאוששות', 'Medical Leave', 'חופשת מחלה', 'כל הפצועים חוזרים שבוע מוקדם יותר.'),
    ('Coach Brandon Reyes', 'המאמן ברנדון רייס', 'התאוששות', 'Ice Bath', 'אמבט קרח', '15 סיבולת לכל הרוסטר.'),
    ('Mama Lucia', 'מאמא לוצ\'יה', 'התאוששות', 'Family Dinner', 'ארוחה משפחתית', 'המורל של כל הרוסטר עולה.'),
    ('Garrett Pike', 'גארט פייק', 'התאוששות', 'Second Wind', 'רוח שנייה', 'מתאבק אחד חוזר לסיבולת מלאה.'),
    ('Yuki Tanabe', 'יוקי טנאבה', 'התאוששות', 'Training Camp', 'מחנה אימונים', 'כל הצעירים בפיתוח מקבלים נקודות ניסיון.'),
    ('Dante Corvino', 'דנטה קורבינו', 'התקפה', 'Backstage Ambush', 'מארב מאחורי הקלעים', 'שני מתאבקים אקראיים של יריב נפצעים לתוכנית הבאה שלו.'),
    ('Serena Blackwell', 'סרינה בלקוול', 'התקפה', 'Poach', 'חטיפה', 'לוקחים מתאבק ממותג יריב לצמיתות (לא מחזיק תואר).'),
    ('Ox Brannigan', 'אוקס בראניגן', 'התקפה', 'Bad Press', 'עיתונות רעה', 'כל הרוסטר של יריב מאבד 5 פופולריות.'),
    ('Vivienne Lacroix', 'ויויאן לקרואה', 'התקפה', 'Sabotage', 'חבלה', 'בונוס האיכות של האולם של יריב מתבטל לשבוע אחד.'),
    ('The Commissioner', 'הנציב', 'התקפה', 'Executive Order', 'צו מנהלי', 'מבטלים את הקלף האחרון שיריב הפעיל.'),
]
gms = [{'id': f'G{i + 1:02d}', 'name': g[0], 'nameHe': g[1], 'family': g[2], 'card': g[3], 'cardHe': g[4], 'effect': g[5]} for i, g in enumerate(GMS)]

os.makedirs(HERE, exist_ok=True)
json.dump(wrestlers, open(os.path.join(HERE, 'roster.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(gms, open(os.path.join(HERE, 'gms.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- מסמך ----------
def table(rows):
    out = ['| # | שם | בעברית | מגדר | מחלקה | צד | פופולריות | ניסיון | משכורת | הערות |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for w in rows:
        notes = []
        if w['tagTeam']:
            notes.append(f"צמד {w['tagTeam']}")
        if w['potential']:
            notes.append(f"פוטנציאל {w['potential']}/5")
        if w['scoutLevel'] is not None and w['pool'] != 'local':
            notes.append(f"סקאוט רמה {w['scoutLevel']}")
        if w['contractWeeks']:
            notes.append(f"חוזה {w['contractWeeks']} שבועות")
        out.append(f"| {w['id']} | {w['name']} | {w['nameHe']} | {'אישה' if w['gender'] == 'F' else 'גבר'} | {w['classHe']} | {w['roleHe']} | {w['popularity']} | {w['ringLevel']} | ${w['salary'] // 1000}K | {' · '.join(notes)} |")
    return '\n'.join(out)


summary = ['| שכבה | מאגר | גברים | נשים | סה"כ | פופולריות | ניסיון | משכורת לעונה |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
pool_he = {'active': 'דראפט', 'legend': 'גיוס: אגדות', 'former': 'גיוס: סקאוטים', 'free': 'גיוס: סקאוטים', 'local': 'גיוס: זמין תמיד'}
for t in TIERS:
    rows = [w for w in wrestlers if w['tier'] == t[0]]
    m = sum(1 for w in rows if w['gender'] == 'M')
    summary.append(f"| {t[1]} | {pool_he[t[2]]} | {m} | {len(rows) - m} | {len(rows)} | {t[4][0]}–{t[4][1]} | {t[5][0]}–{t[5][1]} | ${t[7][0]}K–{t[7][1]}K |")

gm_rows = ['| # | מנהל | בעברית | משפחה | קלף בלעדי | מה הוא עושה |', '| --- | --- | --- | --- | --- | --- |']
for g in gms:
    gm_rows.append(f"| {g['id']} | {g['name']} | {g['nameHe']} | {g['family']} | {g['card']} ({g['cardHe']}) | {g['effect']} |")

sections = []
for t in TIERS:
    rows = [w for w in wrestlers if w['tier'] == t[0]]
    sections.append(f"## {t[1]}\n\n{TIER_LINE[t[0]][0]}\n\n{table(rows)}\n")

doc = f'''---
title: רוסטר LWF
kind: נתוני תוכן
version: 0.1
date: 2026-11-19
status: טיוטה, המספרים לפי מודל עבודה
lead: 300 מתאבקים ו-20 מנהלים בדיוניים, מחולקים לשכבות כמו במשחק המקורי: 180 פעילים לדראפט, ו-120 לגיוס במהלך העונה.
---

## בקצרה

- **פעילים לדראפט (180):** כוכבי על, כוכבים, מידקארד, כוכבים עולים וצעירים בפיתוח. כמו במקור, כל מי שמסומן פעיל נכנס לדראפט.
- **גיוס במהלך העונה (120):**
  - **אגדות:** יקרות, עם חוזה קצר, ומתחלפות בכל שבוע.
  - **כוכבי עבר:** מתאבקים טובים שנמצאים רק דרך סקאוטים ברמות גבוהות.
  - **סוכנים חופשיים:** נמצאים דרך סקאוטים ברמות נמוכות.
  - **כישרון מקומי:** זול וחלש, וזמין בכל שבוע בלי סקאוטים.
- **חלוקה:** כ-65% גברים ו-35% נשים בכל שכבה, וצדדים מאוזנים בין טוב לרע.
- **צמדים:** 20 צמדי גברים ו-10 צמדי נשים מתוך הפעילים. בני הזוג תמיד באותו צד.
- **נתונים מלאים:** `content/roster.json` ו-`content/gms.json`. כל מתאבק כולל עיר מוצא, גיל, תיאור קצר בשתי השפות, ומשכורת.

> [!לאמת]
> הטווחים של פופולריות, ניסיון ומשכורת הם מודל עבודה לפי מה שידוע מהמקור: פופולריות 1–100, ומשכורות דראפט של עד כ-250 אלף דולר. יעודכנו במחקר המספרים במחשב. השמות ייבדקו מול מתאבקים אמיתיים לפני ההפקה.

## השכבות

{chr(10).join(summary)}

## המנהלים

20 מנהלים, כמו במקור. לכל אחד קלף בלעדי מאחת מארבע המשפחות: כלכלה, יריבויות, התאוששות והתקפה.

{chr(10).join(gm_rows)}

{chr(10).join(sections)}'''
open(os.path.join(ROOT, 'docs', 'roster.md'), 'w', encoding='utf-8').write(doc)
print(len(wrestlers), 'מתאבקים,', len(gms), 'מנהלים')
