/* =====================================================================
   ONLINE: rooms on Firebase. The host's device runs the game; every
   phone mirrors it and sends its own answers and choices back.
   ===================================================================== */
const FB_CFG={apiKey:"AIzaSyBizXqeKBCML7KMlsdl1BIPrak0RGQRi4c",authDomain:"territorianisso.firebaseapp.com",databaseURL:"https://territorianisso-default-rtdb.europe-west1.firebasedatabase.app",projectId:"territorianisso",appId:"1:677306737146:web:775485b60b9dfe64968443"};
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('script')); document.head.appendChild(s); }); }
const NET={
  ready:null, uid:null, db:null, offset:0,
  load(){
    if(this.ready) return this.ready;
    this.ready=(async()=>{
      if(window.__LOCALNET){ this.db=window.__LOCALNET; this.uid=this.db.uid; return true; }
      const base='https://cdn.jsdelivr.net/npm/firebase@10.12.2/';
      for(const f of ['firebase-app-compat.js','firebase-auth-compat.js','firebase-database-compat.js']) await loadScript(base+f);
      if(!firebase.apps.length) firebase.initializeApp(FB_CFG);
      const cred=await firebase.auth().signInAnonymously(); this.uid=cred.user.uid;
      this.db=firebase.database();
      this.db.ref('.info/serverTimeOffset').on('value',s=>this.offset=s.val()||0);
      return true;
    })().catch(e=>{ this.ready=null; throw e; });
    return this.ready;
  },
  now(){ return Date.now()+this.offset },
  ref(p){ return this.db.ref(p) }
};
let ON=null;   // {code, role, hostPlays, players, ver, prompt, promptN, lastIn, offs:[]}
const netErr=e=>{ const m=String(e&&(e.code||e.message)||e); return /ADMIN_ONLY|operation-not-allowed|admin-restricted/i.test(m)?'השרת עדיין לא מוגדר: צריך להפעיל התחברות אנונימית ב־Firebase.':/permission/i.test(m)?'השרת חסם את הפעולה: צריך להדביק את חוקי האבטחה ב־Firebase.':'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.'; };
function onlineOff(){ if(ON){ ON.offs.forEach(f=>{try{f()}catch(e){}}); } ON=null; }
function listen(path,cb){ const r=NET.ref(path); const h=s=>cb(s.val()); r.on('value',h); ON.offs.push(()=>r.off('value',h)); }
function meCard(){ return {name:(SET.me.name||'שחקן').slice(0,20),av:SET.me.av,g:SET.me.g,tm:SET.me.time||0,t:NET.now()} }

SCREENS.online=(s)=>{
  s.classList.add('scroll');
  const size=store.get('pubSize',4);
  s.innerHTML=`<div class="topbar"><button class="iconbtn" id="back" aria-label="חזרה">→</button><div class="logo" style="font-size:34px">משחק אונליין</div><span style="width:40px"></span></div>
    <div class="pl" id="olMe" style="cursor:pointer;margin-bottom:12px"><span class="av" style="background:${COLORS[0]}">${SET.me.av}</span><b>${esc(SET.me.name||'שחקן')}</b><span class="g">השם והדמות שלך · עריכה</span></div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <b style="font-size:18px">🌍 משחק פתוח</b>
      <p class="hint">נכנסים למשחק עם שחקנים מכל מקום. המשחק מתחיל לבד כשהחדר מתמלא.</p>
      <div class="seg" id="olSize">${[4,6,8].map(n=>`<button data-v="${n}" class="${n===size?'on':''}">${n} שחקנים</button>`).join('')}</div>
      <button class="big" id="olFind">חיפוש משחק</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
      <b style="font-size:18px">🔒 חדר פרטי עם חברים</b>
      <p class="hint">פותחים חדר ושולחים לחברים את הקוד. אפשר גם להשתמש בטלוויזיה או במחשב כמסך ראשי.</p>
      <button class="ghost" id="olCreate">פתיחת חדר פרטי</button>
      <div class="row"><input class="inp" id="olCode" inputmode="numeric" maxlength="4" placeholder="קוד חדר" style="text-align:center;font-size:22px;letter-spacing:6px"><button class="ghost" style="width:auto;white-space:nowrap" id="olJoin">הצטרפות</button></div>
    </div>
    <p class="hint" id="olMsg" style="text-align:center;min-height:20px;padding-top:10px"></p>`;
  $('#back').onclick=()=>go('home');
  $('#olMe').onclick=()=>editPlayer(SET.me,true,()=>{saveSet();go('online')});
  $('#olSize').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; store.set('pubSize',+b.dataset.v); s.querySelectorAll('#olSize button').forEach(x=>x.classList.toggle('on',x===b)); };
  const msg=t=>{ $('#olMsg').textContent=t; };
  const busy=b=>{ ['olCreate','olJoin','olFind'].forEach(i=>$('#'+i).disabled=b); };
  $('#olFind').onclick=async()=>{ busy(true); msg('מחפש משחק…'); try{ await NET.load(); await findPublic(store.get('pubSize',4)); }catch(e){ msg(netErr(e)); busy(false); } };
  $('#olCreate').onclick=async()=>{ busy(true); msg('מתחבר…'); try{ await NET.load(); await createRoom(); }catch(e){ msg(netErr(e)); busy(false); } };
  $('#olJoin').onclick=async()=>{ const code=$('#olCode').value.trim(); if(!/^\d{4}$/.test(code)) return msg('הקוד הוא 4 ספרות.'); busy(true); msg('מתחבר…');
    try{ await NET.load(); const r=await joinRoom(code); if(r){ msg(r); busy(false); } }catch(e){ msg(netErr(e)); busy(false); } };
  const pre=(location.hash.match(/^#room(\d{4})$/)||[])[1]; if(pre) $('#olCode').value=pre;
};
const PUB_SET={time:45,answer:'voice',powers:true,qdiff:'mixed'};
async function findPublic(size){
  const v=(await NET.ref(`open/${size}`).once('value')).val()||{}, now=NET.now();
  const cands=Object.entries(v).filter(([,r])=>r&&r.n<size&&now-(r.t||0)<4*60*1000).sort((a,b)=>b[1].n-a[1].n);
  for(const [code] of cands){ try{ const err=await joinRoom(code,size); if(!err) return; }catch(e){} }
  await createRoom(size);
}
async function createRoom(pub){
  for(let i=0;i<12;i++){
    const code=String(1000+Math.floor(Math.random()*9000));
    const res=await NET.ref(`rooms/${code}/host`).transaction(cur=>cur===null?NET.uid:undefined);
    if(res.committed){
      await NET.ref(`rooms/${code}/created`).set(NET.now());
      onlineOff(); ON={code,role:'host',hostPlays:true,players:{},ver:0,prompt:null,promptN:0,lastIn:{},offs:[],ready:new Set(),pub:pub||0,born:Date.now()};
      await NET.ref(`rooms/${code}/players/${NET.uid}`).set(meCard());
      if(pub) await NET.ref(`open/${pub}/${code}`).set({host:NET.uid,n:1,t:NET.now()});
      go('lobby'); return;
    }
  }
  throw new Error('no code');
}
async function joinRoom(code,pub){
  const snap=await NET.ref(`rooms/${code}`).once('value'); const room=snap.val();
  if(!room||!room.host) return 'לא מצאנו חדר עם הקוד הזה.';
  if(room.state&&room.state.scr&&!(room.players&&room.players[NET.uid])) return 'המשחק בחדר הזה כבר התחיל.';
  if(pub&&Object.keys(room.players||{}).length>=pub) return 'החדר מלא.';
  await NET.ref(`rooms/${code}/players/${NET.uid}`).set(meCard());
  onlineOff(); ON={code,role:'client',players:{},offs:[],seq:0,lastV:0,pub:pub||0,born:Date.now()};
  go('lobby'); return null;
}
SCREENS.lobby=(s)=>{
  if(!ON) return go('online');
  if(ON.pub) return pubLobby(s);
  SND.setMood('board');
  const host=ON.role==='host';
  s.classList.add('scroll');
  s.innerHTML=`<div class="topbar"><button class="iconbtn" id="back" aria-label="יציאה">✕</button><div class="logo" style="font-size:34px">חדר משחק</div><span style="width:40px"></span></div>
    <div class="card" style="text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center">
      <span class="flabel">קוד החדר</span><div class="big-num" style="letter-spacing:10px">${ON.code}</div>
      <p class="hint">${host?'שתפו את הקוד. כל אחד נכנס למשחק ← "משחק אונליין" ← מקליד את הקוד.':'מחכים שהמארח יתחיל את המשחק…'}</p>
      ${host?'<button class="ghost" id="lbShare" style="width:auto">העתקת הזמנה</button>':''}
    </div>
    <div class="field"><span class="flabel" id="lbCount">שחקנים בחדר</span><div class="players" id="lbList"></div></div>
    ${host?`<div class="field"><span class="flabel">המכשיר הזה</span><div class="seg" id="lbRole"><button data-v="1">גם משחק</button><button data-v="0">רק מסך ראשי</button></div>
      <p class="hint">"מסך ראשי" מתאים לטלוויזיה או למחשב: הוא מציג את הלוח והשאלות, וכולם עונים מהטלפונים.</p></div>
      <div class="field"><span class="flabel">שחקני מחשב שיצטרפו</span><div class="seg" id="lbBots">${[0,1,2,3,5,8].map(n=>`<button data-v="${n}">${n}</button>`).join('')}</div></div>
      <div class="field"><button class="ghost" id="lbSet">הגדרות משחק: ${SET.time} שניות · ${{voice:'בקול',type:'הקלדה',choices:'4 תשובות',host:'סימון עצמי'}[SET.answer]} · כוחות ${SET.powers?'פועלים':'כבויים'}</button></div>
      <div class="sticky-foot"><button class="big" id="lbStart">התחלת המשחק</button></div>`:''}`;
  $('#back').onclick=()=>modal({title:'לצאת מהחדר?',buttons:[{label:'יציאה',fn:()=>leaveRoom()},{label:'להישאר',cls:'ghost',fn:()=>{}}]});
  const draw=()=>{ const ps=Object.entries(ON.players||{}).sort((a,b)=>(a[1].t||0)-(b[1].t||0));
    $('#lbCount').textContent=`שחקנים בחדר (${ps.length})`;
    $('#lbList').innerHTML=ps.map(([u,p],i)=>`<div class="pl"><span class="av" style="background:${COLORS[i%COLORS.length]}">${esc(p.av||'🙂')}</span><b>${esc(p.name)}</b><span class="g">${u===NET.uid?'את/ה':''}</span></div>`).join('')||'<p class="hint">עוד אין שחקנים.</p>';
    if(host){ const n=ps.length+(ON.bots||0); $('#lbStart').disabled=n<2; $('#lbStart').textContent=n<2?'צריך לפחות 2 שחקנים':`התחלת המשחק (${n} שחקנים)`; } };
  if(!ON.listening){ ON.listening=true; listen(`rooms/${ON.code}/players`,v=>{ ON.players=v||{}; if(SCREEN==='lobby') draw(); });
    if(!host) listen(`rooms/${ON.code}/state`,v=>{ if(v) clientState(v); });
    if(!host) listen(`rooms/${ON.code}/host`,v=>{ if(v===null&&ON){ onlineOff(); go('home'); toast('🚪','המארח סגר את החדר'); } }); }
  draw();
  if(host){
    ON.bots=ON.bots||0;
    const segs=()=>{ s.querySelectorAll('#lbRole button').forEach(b=>b.classList.toggle('on',(b.dataset.v==='1')===ON.hostPlays)); s.querySelectorAll('#lbBots button').forEach(b=>b.classList.toggle('on',+b.dataset.v===ON.bots)); };
    segs();
    $('#lbRole').onclick=async e=>{ const b=e.target.closest('button'); if(!b) return; ON.hostPlays=b.dataset.v==='1'; segs();
      const r=NET.ref(`rooms/${ON.code}/players/${NET.uid}`); if(ON.hostPlays) await r.set(meCard()); else await r.remove(); };
    $('#lbBots').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; ON.bots=+b.dataset.v; segs(); draw(); };
    $('#lbSet').onclick=()=>{ SETUP_ONLINE=true; go('setup'); };
    $('#lbShare').onclick=()=>{ const t=`בואו לשחק טריטוריה! 🎮\nנכנסים ל"משחק אונליין" ומקלידים את הקוד: ${ON.code}\n${location.origin+location.pathname}#room${ON.code}`;
      (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('📋','ההזמנה הועתקה','אפשר להדביק בוואטסאפ')).catch(()=>modal({title:'הזמנה',text:t,buttons:[{label:'סגירה',fn:()=>{}}]})); };
    $('#lbStart').onclick=()=>hostStart();
  }
};
let SETUP_ONLINE=false;
function pubLobby(s){
  SND.setMood('board'); const host=ON.role==='host', size=ON.pub;
  s.innerHTML=`<div class="topbar"><button class="iconbtn" id="back" aria-label="ביטול">✕</button><div class="logo" style="font-size:34px">משחק פתוח</div><span style="width:40px"></span></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center">
      <div class="loading" style="font-size:18px;color:var(--text)">מחפשים שחקנים</div>
      <div class="big-num" id="pbN">1/${size}</div>
      <div class="players" id="pbList" style="width:100%"></div>
      <p class="hint" id="pbHint">המשחק יתחיל לבד כשיגיעו ${size} שחקנים.</p>
      <div id="pbAct" style="width:100%;display:flex;flex-direction:column;gap:8px"></div>
    </div>`;
  $('#back').onclick=()=>leaveRoom(true);
  const draw=()=>{ const ps=Object.entries(ON.players||{}).sort((a,b)=>(a[1].t||0)-(b[1].t||0)).slice(0,size);
    $('#pbN').textContent=`${ps.length}/${size}`;
    $('#pbList').innerHTML=ps.map(([u,p],i)=>`<div class="pl" style="animation:pwIn .4s both"><span class="av" style="background:${COLORS[i%COLORS.length]}">${esc(p.av||'🙂')}</span><b>${esc(p.name)}</b><span class="g">${u===NET.uid?'את/ה':''}</span></div>`).join('');
    if(host){ NET.ref(`open/${size}/${ON.code}`).update({n:ps.length}).catch(()=>{}); if(ps.length>=size&&!ON.started) hostStart(); }
    const waited=(Date.now()-ON.born)/1000, act=$('#pbAct'); if(!act) return; act.innerHTML='';
    if(host&&waited>35&&ps.length>=2){ const b=document.createElement('button'); b.className='big'; b.textContent=`להתחיל עכשיו (${size-ps.length} שחקני מחשב ישלימו)`; b.onclick=()=>hostStart(); act.appendChild(b); }
    if(waited>35&&ps.length<2){ const b=document.createElement('button'); b.className='ghost'; b.textContent='לשחק בינתיים נגד המחשב'; b.onclick=()=>{ leaveRoom(true).then(()=>{ SET.mode='cpu'; go('setup'); }); }; act.appendChild(b); }
  };
  if(!ON.listening){ ON.listening=true;
    listen(`rooms/${ON.code}/players`,v=>{ ON.players=v||{}; if(SCREEN==='lobby') draw(); });
    if(!host){ listen(`rooms/${ON.code}/state`,v=>{ if(v) clientState(v); });
      listen(`rooms/${ON.code}/host`,v=>{ if(v===null&&ON&&!ON.started){ const sz=ON.pub; onlineOff(); toast('🔄','החדר נסגר, מחפשים חדר אחר'); findPublic(sz).catch(()=>go('online')); } }); }
    ON.timer=setInterval(()=>{ if(!ON||SCREEN!=='lobby') return clearInterval(ON&&ON.timer); draw();
      if(host&&!ON.started&&(Date.now()-ON.born)/1000>90&&Object.keys(ON.players||{}).length>=2) hostStart(); },3000);
    ON.offs.push(()=>clearInterval(ON.timer)); }
  draw();
}
async function leaveRoom(quiet){
  try{ if(ON){ if(ON.pub&&ON.role==='host') await NET.ref(`open/${ON.pub}/${ON.code}`).remove(); if(ON.role==='host') await NET.ref(`rooms/${ON.code}`).remove(); else await NET.ref(`rooms/${ON.code}/players/${NET.uid}`).remove(); } }catch(e){}
  if(ON&&ON.saved) Object.assign(SET,ON.saved);
  onlineOff(); CL=null; G=null; D=null; Mic.stop(); if(!quiet) go('home'); else go('online');
}

/* ---------- host side ---------- */
function hostStart(){
  if(ON.started) return; ON.started=true;
  if(ON.pub){ NET.ref(`open/${ON.pub}/${ON.code}`).remove().catch(()=>{}); ON.saved={...SET}; Object.assign(SET,PUB_SET); SET.cats=allCatIds().filter(id=>!catById(id).mine); }
  let ps=Object.entries(ON.players||{}).sort((a,b)=>(a[1].t||0)-(b[1].t||0));
  if(ON.pub){ ps=ps.slice(0,ON.pub); ON.bots=Math.max(0,ON.pub-ps.length); }
  const used=ps.map(([,p])=>p.av);
  let players=ps.map(([u,p])=>({name:String(p.name||'שחקן').slice(0,20),av:p.av||'🙂',g:p.g==='f'?'f':'m',time:ON.pub?0:Math.min(120,Math.max(0,+p.tm||0)),human:true,remote:u===NET.uid?undefined:u}));
  const bots=shuffle(BOT_NAMES.slice()).slice(0,ON.bots||0).map(([n,g])=>{ const av=pick(AVATARS.filter(a=>!used.includes(a))); used.push(av); return {name:n,av,g,human:false}; });
  players=players.concat(bots);
  if(!ON.inputsOn){ ON.inputsOn=true; listen(`rooms/${ON.code}/inputs`,v=>hostInputs(v||{})); }
  newGame(players);
  ON.beat=setInterval(()=>{ if(ON&&G) pushState(); },8000); ON.offs.push(()=>clearInterval(ON.beat));
}
const isRemote=p=>!!(p&&p.remote);
const localHuman=p=>!!(p&&p.human&&!p.remote);
function itemRef(cat,item){ if(!item) return null; const i=cat.items.indexOf(item); return i>=0?{i}:{g:{p:item.p,a:item.a}}; }
function itemFrom(cat,ref){ if(!ref) return null; return ref.g?ref.g:cat.items[ref.i]; }
let pushT=0;
function pushState(){
  if(!ON||ON.role!=='host'||!G) return;
  if(pushT) return; pushT=setTimeout(()=>{ pushT=0; if(!ON||!G) return;
    const perf=performance.now(), toSrv=x=>x>perf?Math.round(x-perf+NET.now()):0;
    const st=$('#bstatus');
    const v={v:++ON.ver,pub:ON.pub||0,at:NET.now(),scr:(SCREEN==='duel'&&D)?'duel':'board',answer:SET.answer,powers:!!SET.powers,
      b:{rows:G.rows,cols:G.cols,tiles:G.tiles,hl:G.hl==null?-1:G.hl,targets:G.targets?[...G.targets]:[],status:st?st.innerHTML:(ON.lastStatus||''),
        players:G.players.map(p=>({id:p.id,name:p.name,av:p.av,g:p.g||'m',color:p.color,cat:p.cat,alive:p.alive,pw:p.pw||[],uid:p.remote||(localHuman(p)?NET.uid:''),bot:!p.human}))},
      prompt:ON.prompt||null, over:ON.over==null?-1:ON.over};
    if(st) ON.lastStatus=st.innerHTML;
    if(G.final) v.b.final=G.final.score;
    if(D) v.d={p:D.p.map(x=>x.id),t:D.t.map(Math.round),T:D.T,Tp:(D.Tp||[D.T,D.T]).map(Math.round),active:D.active,cat:D.cat.id,item:itemRef(D.cat,D.item),qn:D.qn,lock:!!D.lock,running:!!D.running,ended:!!D.ended,
      started:!!(D.running||D.ended||D.counting),win:D.win==null?-1:D.win,freeze:D.freezeUntil.map(toSrv),dbl:D.doubleUntil.map(toSrv),bomb:D.bombNext.map(Boolean),
      feed:(($('#feed')||{}).textContent||'').slice(0,120),hist:D.hist.slice(-40).map(h=>({r:itemRef(D.cat,h.item),ok:h.ok})),ready:[...(ON.ready||[])]};
    NET.ref(`rooms/${ON.code}/state`).set(v).catch(()=>{});
  },90);
}
function askRemote(p,kind,data,ms){
  return new Promise(res=>{
    const id=++ON.promptN; ON.prompt={to:p.remote,kind,id,data:data||{}}; ON.pending={id,res,to:p.remote};
    pushState();
    if(ms) setTimeout(()=>{ if(ON&&ON.pending&&ON.pending.id===id){ ON.pending=null; ON.prompt=null; pushState(); res(null); } },ms);
  });
}
function hostInputs(all){
  for(const [uid,inp] of Object.entries(all)){
    if(!inp||ON.lastIn[uid]>=inp.seq) continue; ON.lastIn[uid]=inp.seq;
    const k=inp.kind, val=inp.val||{};
    if(ON.pending&&ON.pending.to===uid&&val.pid===ON.pending.id){ const r=ON.pending.res; ON.pending=null; ON.prompt=null; r(val); pushState(); continue; }
    if(!D) continue;
    const ap=D.p[D.active];
    if(k==='ready'){ ON.ready.add(uid); pushState(); const dueling=D.p.filter(isRemote).map(p=>p.remote); if(!D.running&&!D.counting&&!D.ended&&D.p.every(p=>!localHuman(p))&&dueling.every(u=>ON.ready.has(u))) countdown(); continue; }
    if(!D.running||!ap||ap.remote!==uid||val.qn!==D.qn) continue;
    if(k==='answer'){ if(val.ok) correct(); else pass(); }
    else if(k==='power'&&POWERS[val.k]) duelPower(val.k);
  }
}

/* ---------- client side ---------- */
function sendInput(kind,val){ if(!ON) return; ON.seq=(ON.seq||0)+1; NET.ref(`rooms/${ON.code}/inputs/${NET.uid}`).set({seq:ON.seq,kind,val:val||{},t:NET.now()}).catch(()=>{}); }
let CL=null;   // last state seen by this phone
function clientState(v){
  if(!ON||ON.role!=='client'||v.v<=(ON.lastV||0)) return; ON.lastV=v.v; CL=v; ON.pub=v.pub||0; ON.started=true; ON.seen=Date.now();
  if(!ON.watch){ ON.watch=setInterval(()=>{ if(ON&&ON.role==='client'&&Date.now()-ON.seen>30000&&!ON.lostShown){ ON.lostShown=true; modal({title:'החיבור למארח אבד',text:'המכשיר שפתח את החדר התנתק או נסגר.',buttons:[{label:'יציאה',fn:()=>leaveRoom()},{label:'לחכות עוד',cls:'ghost',fn:()=>{ ON.lostShown=false; ON.seen=Date.now(); }}]}); } },5000); ON.offs.push(()=>clearInterval(ON.watch)); }
  if(v.b&&!v.b.players.some(p=>p.uid===NET.uid)){ const sz=ON.pub; NET.ref(`rooms/${ON.code}/players/${NET.uid}`).remove().catch(()=>{}); onlineOff(); CL=null; G=null; toast('🔄','החדר התמלא, מחפשים חדר אחר'); if(sz) findPublic(sz).catch(()=>go('online')); else go('online'); return; }
  SET.answer=v.answer; SET.powers=v.powers;
  const me=NET.uid;
  G={client:true,rows:v.b.rows,cols:v.b.cols,tiles:v.b.tiles,hl:v.b.hl<0?null:v.b.hl,targets:null,attacker:null,auto:false,used:{},
     players:v.b.players.map(p=>({...p,human:p.uid===me,pw:p.pw||[]}))};
  const myPrompt=v.prompt&&v.prompt.to===me?v.prompt:null;
  if(v.b.targets&&v.b.targets.length) G.targets=new Set(v.b.targets);
  if(v.over<0&&ON.overShown){ ON.overShown=false; ON.outShown=false; closeModal(); }
  if(v.over>=0){ const w=G.players[v.over]; if(SCREEN!=='board') go('board'); renderBoard(); setStatus(v.b.status); setActions([]);
    if(!ON.overShown){ ON.overShown=true; SND.win(); NARR.say('win',{force:true}); FX.confetti(200); setTimeout(()=>modal({title:`${w.av} ${w.name} ${G_(w,'כבש','כבשה')} את כל הלוח!`,text:w.uid===me?'ניצחון מלא!':'תודה על המשחק!',buttons:[{label:'יציאה מהחדר',fn:()=>leaveRoom()}]}),700); }
    return; }
  if(v.scr==='duel'&&v.d){ clientDuel(v,myPrompt); return; }
  if(D&&D.mirror){ D=null; $('#vignette').classList.remove('on'); }
  if(SCREEN!=='board') go('board');
  renderBoard(); setStatus(v.b.status); setActions([]);
  const mine=G.players.find(p=>p.uid===me);
  if(mine&&!mine.alive&&!ON.outShown){ ON.outShown=true; SND.lose(); toast('💥','הודחת מהמשחק','אפשר להמשיך לצפות'); }
  if(myPrompt&&ON.answered!==myPrompt.id) clientPrompt(myPrompt);
}
function clientPrompt(pr){
  const me=G.players.find(p=>p.uid===NET.uid); const reply=val=>{ ON.answered=pr.id; sendInput(pr.kind,{...val,pid:pr.id}); closeModal(); setActions([]); };
  SND.badge(); buzz([40,30,40]);
  if(pr.kind==='target'){
    const ids=pr.data.ids||[]; G.targets=new Set(ids); G.pick=id=>reply({id,joker:!!G.joker}); renderBoard();
    setStatus(`<b>${esc(me.name)}</b>, ${G_(me,'את מי אתה מאתגר?','את מי את מאתגרת?')}`);
    const a=$('#bactions'); a.innerHTML=''; const list=document.createElement('div'); list.className='tgt-list'; G.joker=false;
    if(pr.data.joker){ const jb=document.createElement('button'); jb.className='pw'; jb.style.alignSelf='center'; const paint=()=>{ jb.textContent=G.joker?`🃏 ג'וקר פעיל: הדו־קרב בקטגוריה שלך`:`🃏 להפעיל ג'וקר`; }; paint(); jb.onclick=()=>{ G.joker=!G.joker; paint(); }; a.appendChild(jb); }
    ids.map(i=>G.players[i]).forEach(x=>{ const cat=catById(x.cat), b=document.createElement('button'); b.className='tgt-btn'; b.innerHTML=`<span class="av" style="background:${x.color}">${esc(x.av)}</span><b>${esc(x.name)}</b><span>${cat.icon} ${esc(cat.name)}</span>`; b.onclick=()=>G.pick(x.id); list.appendChild(b); });
    a.appendChild(list);
  } else if(pr.kind==='shield'){
    const by=G.players[pr.data.by];
    modal({title:`${by.name} ${G_(by,'תוקף','תוקפת')} אותך!`,text:'יש לך 🛡️ מגן. להפעיל אותו ולחסום את ההתקפה?',buttons:[{label:'🛡️ להפעיל מגן',fn:()=>reply({use:true})},{label:'לא, נלחמים',cls:'ghost',fn:()=>reply({use:false})}]});
  } else if(pr.kind==='after'){
    const n=document.createElement('div'); let keep=me.cat;
    if(pr.data.lc&&pr.data.lc!==me.cat){ const wc=catById(me.cat), lc=catById(pr.data.lc);
      n.innerHTML=`<p>איזו קטגוריה תהיה שלך מעכשיו?</p><div class="seg" id="kp"><button data-v="${me.cat}" class="on">${wc.icon} ${esc(wc.name)}</button><button data-v="${pr.data.lc}">${lc.icon} ${esc(lc.name)}</button></div>`;
      n.querySelector('#kp').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; keep=b.dataset.v; n.querySelectorAll('#kp button').forEach(x=>x.classList.toggle('on',x===b)); }; }
    const btns=[]; if(pr.data.canGo) btns.push({label:'לאתגר עוד שכן',fn:()=>reply({keep,go:true})});
    btns.push({label:'חזרה להגרלה',cls:pr.data.canGo?'ghost':'big',fn:()=>reply({keep,go:false})});
    modal({title:'ניצחת!',node:n,buttons:btns});
  }
}
function clientDuel(v,myPrompt){
  const d=v.d, cat=catById(d.cat); if(!cat) return;
  const ps=d.p.map(i=>G.players[i]); const fresh=!D||!D.mirror||D.key!==d.p.join()+':'+cat.id;
  const perf=performance.now(), fromSrv=x=>x?perf+(x-NET.now()):0;
  const prevQn=D&&D.mirror?D.qn:-1, prevEnded=D&&D.mirror&&D.ended;
  D=Object.assign(fresh?{mirror:true,key:d.p.join()+':'+cat.id,lock:false,loading:false}:D,{p:ps,T:d.T,Tp:d.Tp||[d.T,d.T],active:d.active,cat,qn:d.qn,running:d.running,ended:d.ended,
    snapT:d.t.slice(),snapAt:v.at,serverLock:d.lock,freezeUntil:d.freeze.map(fromSrv),doubleUntil:d.dbl.map(fromSrv),bombNext:d.bomb,hist:(d.hist||[]).map(h=>({item:itemFrom(cat,h.r),ok:h.ok})),
    item:itemFrom(cat,d.item),streak:[0,0],win:d.win});
  D.t=d.t.slice();
  if(fresh||SCREEN!=='duel'){ go('duel'); }
  const amIn=ps.some(p=>p.uid===NET.uid);
  if(!d.started){
    const ready=(d.ready||[]).includes(NET.uid), ik=D.key+'|'+ready;
    if(!fresh&&D.introKey===ik&&$('#stage .vs')) return;
    D.introKey=ik;
    const st=$('#stage'), c=$('#controls'); renderClocks(true);
    st.innerHTML=`<div class="vs"><div class="side l" style="--pc:${ps[0].color}"><div class="disc" style="background:${ps[0].color}">${esc(ps[0].av)}</div><b>${esc(ps[0].name)}</b></div><div class="x">VS</div><div class="side r" style="--pc:${ps[1].color}"><div class="disc" style="background:${ps[1].color}">${esc(ps[1].av)}</div><b>${esc(ps[1].name)}</b></div></div><div class="intro-cat">${cat.icon} ${esc(cat.name)}</div>`;
    c.innerHTML='';
    if(amIn){ const b=document.createElement('button'); b.className='big'; b.textContent=ready?'מחכים ליריב…':(SET.answer==='voice'?'🎤 אני מוכן/ה':'אני מוכן/ה'); b.disabled=ready;
      b.onclick=()=>{ if(SET.answer==='voice'&&Mic.available()) Mic.start(); SND.init(); sendInput('ready',{}); b.disabled=true; b.textContent='מחכים ליריב…'; }; c.appendChild(b); }
    else c.innerHTML='<div class="thinking">👀 צופים בדו־קרב</div>';
    if(fresh){ SND.whoosh(); setTimeout(()=>{SND.slam();buzz(60);NARR.seq(['duel','cat-'+cat.id])},380); }
    return;
  }
  if(d.ended){ if(!prevEnded){ Mic.stop(); $('#vignette').classList.remove('on'); const w=ps[d.win], l=ps[1-d.win];
      NARR.say('timeup'); if(w.uid===NET.uid){ SND.win(); FX.confetti(120); } else if(l.uid===NET.uid) SND.lose();
      $('#turn').textContent=''; renderClocks();
      $('#stage').innerHTML=`<div class="result"><div class="crown">${esc(w.av)}</div><h3 style="color:${w.color}">${esc(w.name)} ${G_(w,'ניצח','ניצחה')}!</h3><div class="replay">${D.hist.filter(h=>h.item).map(h=>`<div class="rp ${h.ok?'ok':'no'}"><div class="th">${thumbHTML(cat,h.item)}</div><span>${esc(h.item.a[0])}</span></div>`).join('')}</div></div>`;
      $('#controls').innerHTML='<div class="thinking">חוזרים ללוח…</div>'; }
    return; }
  if(fresh||prevQn!==d.qn){
    if(prevQn>=0&&prevQn!==d.qn&&D.hist.length&&D.hist[D.hist.length-1].ok) { SND.ok(); FX.elBurst($('#stage .qcard'),'#38e09a',24,6); }
    D.lock=false; D.loading=IMG_KINDS.has(cat.kind);
    const p=D.p[D.active]; $('#turn').innerHTML=`התור של <b style="color:${p.color}">${esc(p.av)} ${esc(p.name)}</b>`; BG.setTint(hexToRgb(p.color));
    const item=D.item; renderControls();
    renderQuestion($('#stage'),cat,item,()=>{ if(D&&D.mirror&&D.item===item){ D.loading=false; renderControls(); } },()=>{});
    if(!D.tick){ D.tick=true; const loop=()=>{ if(!D||!D.mirror||!D.running){ if(D) D.tick=false; return; } const now=NET.now(); const el=Math.max(0,now-Math.max(D.snapAt,D.freezeUntil[D.active]?D.freezeUntil[D.active]-performance.now()+now:0));
        D.t=D.snapT.slice(); D.t[D.active]=Math.max(0,D.snapT[D.active]-el); renderClocks(); const ms=D.t[D.active]; $('#vignette').classList.toggle('on',ms<10000&&ms>0); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  } else if(d.lock&&!D.lock){ D.lock=true; SND.pass(); shakeEl($('#stage')); const r=document.createElement('div'); r.className='reveal'; r.innerHTML=`<small>התשובה</small>${esc(D.item.a[0])}`; $('#stage').appendChild(r); renderControls(); }
  else renderControls();
  const fb=$('#feed'); if(d.feed&&fb&&!fb.classList.contains('ok')) fb.textContent=d.feed;
}

/* ---------- daily leaderboard ---------- */
async function dailySubmit(score){ if(Mic.inClaude) return; try{ await NET.load(); await NET.ref(`daily/${todayKey()}/${NET.uid}`).set({name:(SET.me.name||'שחקן').slice(0,20),av:SET.me.av,score}); }catch(e){} }
async function dailyBoard(el){
  if(Mic.inClaude||!el) return;
  el.innerHTML='<p class="hint" style="text-align:center">טוען את טבלת היום…</p>';
  try{ await NET.load(); const s=await NET.ref(`daily/${todayKey()}`).orderByChild('score').limitToLast(10).once('value'); const rows=[]; s.forEach(c=>{ rows.push({uid:c.key,...c.val()}); });
    rows.sort((a,b)=>b.score-a.score);
    el.innerHTML=rows.length?`<span class="flabel">טבלת היום</span><div class="list">${rows.map((r,i)=>`<div class="li" style="${r.uid===NET.uid?'border-color:var(--amber)':''}"><b style="width:22px;text-align:center">${i+1}</b><span style="font-size:22px">${esc(r.av||'🙂')}</span><div><b>${esc(r.name)}</b></div><b style="color:var(--amber)">${r.score}</b></div>`).join('')}</div>`:'<p class="hint" style="text-align:center">עוד אין תוצאות היום. היו הראשונים!</p>';
  }catch(e){ el.innerHTML=''; }
}

/* ---------- rematch in the same room ---------- */
function rematchRoom(){ if(!ON||ON.role!=='host') return; ON.started=false; ON.over=null; ON.prompt=null; ON.pending=null; if(ON.saved) Object.assign(SET,ON.saved); hostStart(); }

/* ---------- emoji reactions (everyone in the room sees them) ---------- */
const REACTS=['👏','😂','🔥','😱','🤯','❤️'];
function floatEmoji(e){ if(!REACTS.includes(e)) return; const f=document.createElement('div'); f.className='floaty'; f.textContent=e; f.style.left=(10+Math.random()*75)+'%'; document.body.appendChild(f); setTimeout(()=>f.remove(),2700); SND.tone(900+Math.random()*400,.08,{type:'sine',vol:.05}); }
function reactHook(name){
  document.querySelectorAll('.react-btn,.react-bar').forEach(x=>x.remove());
  if(!ON||!(name==='board'||name==='duel')) return;
  if(!ON.reactOn){ ON.reactOn=true; ON.reactSeen={}; ON.reactFrom=NET.now(); listen(`rooms/${ON.code}/react`,v=>{ for(const [u,r] of Object.entries(v||{})){ if(!r||!r.t||u===NET.uid) continue; if(r.t>(ON.reactSeen[u]||ON.reactFrom)){ ON.reactSeen[u]=r.t; floatEmoji(r.e); } } }); }
  const b=document.createElement('button'); b.className='react-btn'; b.textContent='😀'; b.setAttribute('aria-label','תגובה');
  b.onclick=()=>{ let bar=document.querySelector('.react-bar'); if(bar){ bar.remove(); return; } bar=document.createElement('div'); bar.className='react-bar';
    REACTS.forEach(e=>{ const x=document.createElement('button'); x.textContent=e; x.onclick=()=>{ floatEmoji(e); NET.ref(`rooms/${ON.code}/react/${NET.uid}`).set({e,t:NET.now()}).catch(()=>{}); bar.remove(); }; bar.appendChild(x); });
    document.body.appendChild(bar); };
  document.body.appendChild(b);
}

/* ---------- share my category with the family ---------- */
async function shareCat(c){
  try{
    toast('📤','מעלה את הקטגוריה…'); await NET.load();
    const data={owner:NET.uid,name:String(c.name).slice(0,40),icon:c.icon||'📸',t:NET.now(),items:c.items.map(x=>({img:x.img,a:x.a.map(t=>String(t).slice(0,40)).slice(0,6)}))};
    if(JSON.stringify(data).length>9e6) return modal({title:'הקטגוריה גדולה מדי',text:'נסו לשתף קטגוריה עם פחות תמונות.',buttons:[{label:'סגירה',fn:()=>{}}]});
    let code=c.shared;
    if(!code){ for(let i=0;i<10;i++){ const k=String(100000+Math.floor(Math.random()*900000)); const ex=(await NET.ref(`shared/${k}`).once('value')).val(); if(!ex){ code=k; break; } } }
    await NET.ref(`shared/${code}`).set(data); c.shared=code; await IDB.put(c);
    const t=`הוסיפו את הקטגוריה "${c.name}" לטריטוריה 📸\nבמשחק: "הקטגוריות שלי" ← מקלידים את הקוד ${code}`;
    modal({title:`קוד: ${code}`,text:'שלחו את הקוד למשפחה. מי שמקליד אותו ב"הקטגוריות שלי" מקבל עותק של הקטגוריה.',buttons:[
      {label:'העתקת הודעה',fn:()=>{ (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('📋','ההודעה הועתקה')).catch(()=>toast('📋','הקוד: '+code)); }},{label:'סגירה',cls:'ghost',fn:()=>{}}]});
  }catch(e){ modal({title:'השיתוף לא הצליח',text:netErr(e),buttons:[{label:'סגירה',fn:()=>{}}]}); }
}
async function importSharedCat(code){
  if(!/^\d{6}$/.test(code)) return toast('⚠️','הקוד הוא 6 ספרות');
  try{
    await NET.load(); const v=(await NET.ref(`shared/${code}`).once('value')).val();
    if(!v||!Array.isArray(v.items)) return toast('🤷','לא מצאנו קטגוריה עם הקוד הזה');
    const c={id:'my-'+Date.now(),name:String(v.name||'קטגוריה').slice(0,40),icon:v.icon||'📸',from:code,
      items:v.items.filter(x=>x&&typeof x.img==='string'&&x.img.startsWith('data:image/')&&Array.isArray(x.a)).map(x=>({img:x.img,a:x.a.map(String).slice(0,6)}))};
    MYCATS.push(c); await IDB.put(c); syncMyCats(); STATS.created=true; saveStats(); checkAch();
    SND.ok(); toast(c.icon,'הקטגוריה נוספה',`${c.name} · ${c.items.length} תמונות`); go('mycats');
  }catch(e){ toast('⚠️',netErr(e)); }
}
