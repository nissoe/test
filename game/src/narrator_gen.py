# Generates the narrator clips (Azure he-IL Avri) into game/voice and a manifest.
import json,os,time,urllib.request,html
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','voice')
A=("+18%","+10%","+20%")   # energetic: rate, pitch, volume
B=("+28%","+18%","+35%")   # game-show peak
L={
 'welcome':('A',["ברוכים הבאים לטריטוריה! הלוח מחכה.","יאללה, מתחילים! מי יכבוש את כל הלוח?","שחקנים, למקומות! המשחק מתחיל."]),
 'spin':('A',["ההגרלה מתחילה...","מי יהיה התוקף הבא?","בואו נראה על מי זה ייפול..."]),
 'picked':('B',["ויש לנו תוקף!!","הנה זה!! התור שלך לתקוף!!","הגורל החליט!!"]),
 'duel':('B',["דו־קרב!!","ראש בראש!!","זה דו־קרב!!"]),
 'c3':('B',["שלוש!"]),'c2':('B',["שתיים!"]),'c1':('B',["אחת!"]),'go':('B',["יאללה!!"]),
 'ten':('B',["עשר שניות!!","נשארו עשר שניות!!"]),
 'timeup':('B',["הזמן נגמר!!","הזמן אזל!!"]),
 'streak5':('B',["רצף של חמש!!","חמש ברצף!! איזה קצב!"]),
 'streak10':('B',["רצף של עשר!! בלתי ניתן לעצירה!!"]),
 'comeback':('B',["איזה קאמבק!!","ברגע האחרון!!"]),
 'capture':('A',["השטח נכבש!","עוד שטח עובר ידיים!","הלוח משתנה!"]),
 'pw-shield':('B',["מגן!! ההתקפה נחסמה!!"]),'pw-joker':('B',["ג'וקר!! הקטגוריה מתחלפת!"]),
 'pw-bomb':('B',["פצצת זמן!!"]),'pw-freeze':('B',["השעון קפוא!"]),'pw-steal':('B',["גניבת זמן!!"]),'pw-hint':('A',["רמז!"]),
 'final':('B',["זה הגמר!! מי ייקח את כל הלוח?!","הגמר מתחיל!! הטוב משלושה!"]),
 'win':('B',["יש לנו אלוף!! כל הלוח נכבש!!","ניצחון מוחלט!!"]),
 'daily':('A',["אתגר יומי! שישים שניות, כמה שיותר תשובות!"]),
 'dailyend':('A',["הזמן נגמר! בואו נראה את התוצאה!"]),
}
cats=json.load(open('/tmp/claude-0/-home-user-test/9e1b4bac-37bb-545b-b1cc-d96b514b5dd3/scratchpad/cats_names.json',encoding='utf8'))
for cid,name in cats: L['cat-'+cid]=('A',["הקטגוריה: "+name.replace('׳',"'")])
def ssml(text,lv):
    r,p,v=A if lv=='A' else B
    t=html.escape(text,quote=False)
    return f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='he-IL'><voice name='he-IL-AvriNeural'><prosody rate='{r}' pitch='{p}' volume='{v}'>{t}</prosody></voice></speak>"
man={}; n=0
for ev,(lv,lines) in L.items():
    man[ev]=[]
    for i,t in enumerate(lines):
        fn=f"{ev}-{i+1}.mp3"; path=os.path.join(OUT,fn)
        if not os.path.exists(path):
            for k in range(6):
                try:
                    req=urllib.request.Request('https://swedencentral.tts.speech.microsoft.com/cognitiveservices/v1',data=ssml(t,lv).encode(),method='POST',
                        headers={'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3','User-Agent':'territoria-build'})
                    open(path,'wb').write(urllib.request.urlopen(req,timeout=40).read()); break
                except Exception as e:
                    print(' retry',fn,e,flush=True); time.sleep(8*(k+1))
            time.sleep(3.2); n+=1
        man[ev].append(fn)
json.dump(man,open(os.path.join(OUT,'voice.json'),'w',encoding='utf8'),ensure_ascii=False)
print('clips',sum(len(v) for v in man.values()),'new',n)
