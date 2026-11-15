import { GameScene } from '../render/scene';
import { Session } from '../game/session';
import { CHALLENGES, RUSH_SECONDS, WORLDS, dailyLevel, dayIndex, packLevels, starsFor, type ChallengeId } from '../game/content';
import { LocalSaveStore, defaultProfile, type Profile, type SaveStore } from '../services/save';
import { SKINS, THEMES } from '../render/skins';
import { getLang, setLang, t, tr } from '../i18n';
import { configureFeedback, sfx } from '../audio';
import { h, starsRow } from './dom';
import type { LevelDef, Move } from '../engine/types';

type Mode = 'campaign' | ChallengeId;

interface Play {
  mode: Mode;
  pack: string;
  index: number;
  level: LevelDef;
  session: Session;
  rush?: { score: number; timeLeft: number; order: number[]; cursor: number };
  ended: boolean;
}

const HINT_COST = 25;
const EXTRA_MOVES_COST = 40;

export class App {
  private store: SaveStore = new LocalSaveStore();
  private profile: Profile;
  private scene: GameScene;
  private ui: HTMLElement;
  private screen: HTMLElement | null = null;
  private play: Play | null = null;
  private hud: { moves: HTMLElement; bar: HTMLElement; par: HTMLElement; stars: HTMLElement; timer: HTMLElement | null; hint: HTMLElement } | null = null;
  private worker: Worker | null = null;
  private hintReq = 0;
  private lastSecond = -1;

  constructor(root: HTMLElement) {
    this.profile = this.store.load();
    setLang(this.profile.settings.lang);
    configureFeedback(this.profile.settings.sound, this.profile.settings.haptics);
    const canvas = h('canvas') as HTMLCanvasElement;
    canvas.id = 'gl';
    this.ui = h('div.ui');
    root.append(canvas, this.ui);
    this.scene = new GameScene(canvas, {
      tryMove: (mv) => this.onMove(mv),
      onBump: () => {
        sfx.bump();
        this.scene.bumpShake();
      },
      onDragStart: () => sfx.pick(),
      onTick: (dt) => this.tick(dt),
    });
    if (this.profile.settings.quality === 'low') this.scene.setQuality('low');
    this.scene.setSkin(this.profile.equippedSkin);
    this.scene.setTheme(this.profile.equippedTheme);
    this.showcase();
    this.home();
    if (import.meta.env.DEV) {
      // Dev shortcut: ?lv=w2:5 opens world 2 level 5; ?ch=fog:3 opens a challenge level.
      const q = new URLSearchParams(location.search);
      const lv = q.get('lv');
      const ch = q.get('ch');
      if (lv) {
        const [pack, n] = lv.split(':');
        this.profile.seenIntros.push(pack);
        this.startCampaign(pack, Number(n) - 1);
      } else if (ch) {
        const [id, n] = ch.split(':');
        this.profile.seenIntros.push(id);
        if (id === 'rush') this.startRush();
        else if (id === 'daily') this.startDaily();
        else this.startChallenge(id as ChallengeId, Number(n) - 1);
      }
    }
  }

  // ---------- persistence helpers ----------

  private save() {
    this.store.save(this.profile);
  }
  private totalStars() {
    return Object.values(this.profile.stars).reduce((a, b) => a + b, 0);
  }
  private cleared(id: string) {
    return (this.profile.stars[id] ?? 0) > 0;
  }
  private packCleared(pack: string) {
    const lv = packLevels(pack);
    return lv.length > 0 && this.cleared(lv[lv.length - 1].id);
  }
  private worldUnlocked(k: number) {
    return k === 0 || this.packCleared(WORLDS[k - 1].id);
  }
  private levelUnlocked(pack: string, i: number) {
    if (i === 0) return true;
    return this.cleared(packLevels(pack)[i - 1].id);
  }
  private nextCampaign(): { pack: string; index: number } {
    for (let k = 0; k < WORLDS.length; k++) {
      const lv = packLevels(WORLDS[k].id);
      const i = lv.findIndex((l) => !this.cleared(l.id));
      if (i >= 0) return { pack: WORLDS[k].id, index: i };
    }
    return { pack: 'w12', index: 19 };
  }

  // ---------- screens ----------

  private mount(el: HTMLElement, cls = '') {
    this.screen?.remove();
    this.hud = null;
    el.classList.add('screen');
    if (cls) el.classList.add(cls);
    this.ui.append(el);
    this.screen = el;
    requestAnimationFrame(() => el.classList.add('in'));
  }

  private topBar(title: string, onBack: () => void, extra?: HTMLElement) {
    return h(
      'div.topbar',
      h('button.icon-btn.back', { onclick: () => (sfx.tap(), onBack()), 'aria-label': t('back') }, h('span.chev', '‹')),
      h('div.title', title),
      extra ?? this.coinPill(),
    );
  }

  private coinPill() {
    return h('div.pill.coins', h('span.coin-ico', '◉'), String(this.profile.coins));
  }

  private showcase() {
    const nx = this.nextCampaign();
    const lv = packLevels(nx.pack)[nx.index];
    this.scene.setMode('showcase');
    this.scene.insets = { top: 0, bottom: 0 };
    this.scene.load(new Session(lv));
  }

  home() {
    this.play = null;
    this.showcase();
    const nx = this.nextCampaign();
    const wi = WORLDS.findIndex((w) => w.id === nx.pack);
    const dailyOpen = this.packCleared('w4');
    const doneToday = this.profile.dailyLastDay === dayIndex();
    const el = h(
      'div.home',
      h(
        'div.home-top',
        h('div.pill', h('span.star.on', '★'), String(this.totalStars())),
        this.coinPill(),
        h('button.icon-btn', { onclick: () => (sfx.tap(), this.settings()), 'aria-label': t('settings') }, '⚙'),
      ),
      h(
        'div.logo-wrap',
        getLang() === 'he'
          ? h('h1.logo.logo-he', 'תאו', h('span.lock', 'מים'))
          : h('h1.logo', 'TWIN', h('span.lock', 'LOCK')),
        h('div.logo-twin', getLang() === 'he' ? 'TWINLOCK' : 'תאומים'),
        h('p.tagline', t('tagline')),
      ),
      h(
        'div.home-actions',
        h(
          'button.btn.primary.big',
          { onclick: () => (sfx.tap(), this.startCampaign(nx.pack, nx.index)) },
          h('span.btn-main', this.totalStars() ? t('continue') : t('play')),
          h('span.btn-sub', `${tr(WORLDS[wi].name)} · ${t('level')} ${nx.index + 1}`),
        ),
        h(
          'div.grid2',
          h('button.btn.tile', { onclick: () => (sfx.tap(), this.worlds()) }, h('span.ico', '🌐'), t('worlds')),
          h('button.btn.tile', { onclick: () => (sfx.tap(), this.challenges()) }, h('span.ico', '⚡'), t('challenges')),
          h(
            `button.btn.tile${dailyOpen ? '' : '.locked'}`,
            { onclick: () => (sfx.tap(), dailyOpen ? this.startDaily() : this.toast(`${t('unlockAfter')} ${tr(WORLDS[3].name)}`)) },
            h('span.ico', '📅'),
            t('daily'),
            doneToday ? h('span.badge.ok', '✓') : dailyOpen ? h('span.badge', '!') : null,
          ),
          h('button.btn.tile', { onclick: () => (sfx.tap(), this.shop()) }, h('span.ico', '💎'), t('shop')),
        ),
      ),
    );
    this.mount(el, 'home-screen');
  }

  worlds() {
    this.showcase();
    const list = h('div.scroll.world-list');
    WORLDS.forEach((w, k) => {
      const lv = packLevels(w.id);
      const stars = lv.reduce((a, l) => a + (this.profile.stars[l.id] ?? 0), 0);
      const open = this.worldUnlocked(k);
      const done = lv.filter((l) => this.cleared(l.id)).length;
      list.append(
        h(
          `button.world-card${open ? '' : '.locked'}`,
          {
            style: `--accent:${w.color}`,
            onclick: () => {
              sfx.tap();
              if (open) this.levels(w.id);
              else this.toast(`${t('unlockAfter')} ${tr(WORLDS[k - 1].name)}`);
            },
          },
          h('div.world-num', String(k + 1)),
          h('div.world-icon', w.intro.icon),
          h('div.world-info', h('div.world-name', tr(w.name)), h('div.world-sub', h('span', `${done}/${lv.length} ${t('levels')}`), h('span.sep', ' · '), h('span.star.on', '★'), h('span', ` ${stars}/${lv.length * 3}`)), h('div.progress', h('div.fill', { style: `width:${(done / lv.length) * 100}%` }))),
          open ? null : h('div.lock-ico', '🔒'),
        ),
      );
    });
    this.mount(h('div.panel', this.topBar(t('worlds'), () => this.home()), list));
  }

  levels(pack: string) {
    this.play = null;
    this.showcase();
    const w = WORLDS.find((x) => x.id === pack);
    const c = CHALLENGES.find((x) => x.id === pack);
    const name = w ? tr(w.name) : c ? tr(c.name) : pack;
    const accent = w?.color ?? c?.color ?? '#fff';
    const lv = packLevels(pack);
    const grid = h('div.level-grid');
    lv.forEach((l, i) => {
      const open = this.levelUnlocked(pack, i);
      const st = this.profile.stars[l.id] ?? 0;
      grid.append(
        h(
          `button.level-cell${open ? '' : '.locked'}${st ? '.done' : ''}`,
          {
            onclick: () => {
              sfx.tap();
              if (!open) return;
              if (w) this.startCampaign(pack, i);
              else this.startChallenge(pack as ChallengeId, i);
            },
          },
          h('div.lnum', open ? String(i + 1) : '🔒'),
          open ? starsRow(st, 3, 'mini-stars') : null,
        ),
      );
    });
    this.mount(h('div.panel', { style: `--accent:${accent}` }, this.topBar(name, () => (w ? this.worlds() : this.challenges())), h('div.scroll', grid)));
  }

  challenges() {
    this.showcase();
    const list = h('div.scroll.world-list');
    for (const c of CHALLENGES) {
      const open = this.packCleared(c.unlockAfter);
      const lv = packLevels(c.id);
      const done = c.id === 'rush' ? 0 : lv.filter((l) => this.cleared(l.id)).length;
      const req = WORLDS.find((w) => w.id === c.unlockAfter)!;
      list.append(
        h(
          `button.world-card${open ? '' : '.locked'}`,
          {
            style: `--accent:${c.color}`,
            onclick: () => {
              sfx.tap();
              if (!open) return this.toast(`${t('unlockAfter')} ${tr(req.name)}`);
              if (c.id === 'rush') this.startRush();
              else this.levels(c.id);
            },
          },
          h('div.world-icon', c.icon),
          h(
            'div.world-info',
            h('div.world-name', tr(c.name)),
            h('div.world-sub', tr(c.desc)),
            c.id === 'rush'
              ? h('div.world-sub', `${t('bestScore')}: ${this.profile.rushBest}`)
              : h('div.progress', h('div.fill', { style: `width:${(done / lv.length) * 100}%` })),
          ),
          open ? null : h('div.lock-ico', '🔒'),
        ),
      );
    }
    list.append(
      h(
        'div.world-card.locked.soon',
        h('div.world-icon', '🏆'),
        h('div.world-info', h('div.world-name', `${t('leaderboards')} · ${t('online')}`), h('div.world-sub', t('comingSoon'))),
      ),
    );
    this.mount(h('div.panel', this.topBar(t('challenges'), () => this.home()), list));
  }

  shop() {
    this.showcase();
    const p = this.profile;
    const sec = (title: string, items: HTMLElement[]) => h('div.shop-sec', h('h3', title), h('div.shop-grid', ...items));
    const item = (kind: 'skin' | 'theme', id: string, name: string, price: number, swatch: string[]) => {
      const key = `${kind}:${id}`;
      const owned = p.owned.includes(key);
      const equipped = kind === 'skin' ? p.equippedSkin === id : p.equippedTheme === id;
      return h(
        `button.shop-item${equipped ? '.equipped' : ''}`,
        {
          onclick: () => {
            sfx.tap();
            if (!owned) {
              if (p.coins < price) return this.toast(t('notEnough'));
              p.coins -= price;
              p.owned.push(key);
            }
            if (kind === 'skin') {
              p.equippedSkin = id;
              this.scene.setSkin(id);
            } else {
              p.equippedTheme = id;
              this.scene.setTheme(id);
            }
            this.save();
            this.shop();
          },
        },
        h('div.swatch', ...swatch.map((c) => h('span', { style: `background:${c}` }))),
        h('div.item-name', name),
        h('div.item-price', equipped ? t('equipped') : owned ? t('equip') : `◉ ${price}`),
      );
    };
    const premium = [
      { icon: '◉', name: { he: '500 מטבעות', en: '500 coins' }, price: '₪9.90' },
      { icon: '◉◉', name: { he: '1,500 מטבעות', en: '1,500 coins' }, price: '₪24.90' },
      { icon: '🚫', name: { he: 'הסרת פרסומות', en: 'Remove ads' }, price: '₪14.90' },
      { icon: '👑', name: { he: 'כרטיס תאומים', en: 'TWINLOCK Pass' }, price: '₪19.90' },
    ].map((x) =>
      h(
        'button.shop-item.premium',
        { onclick: () => this.toast(t('comingSoon')) },
        h('div.prem-ico', x.icon),
        h('div.item-name', tr(x.name)),
        h('div.item-price', `${x.price} · ${t('comingSoon')}`),
      ),
    );
    this.mount(
      h(
        'div.panel',
        this.topBar(t('shop'), () => this.home()),
        h(
          'div.scroll',
          sec(t('blockSkins'), SKINS.map((s) => item('skin', s.id, tr(s.name), s.price, s.palette.slice(0, 4)))),
          sec(t('boardThemes'), THEMES.map((th) => item('theme', th.id, tr(th.name), th.price, [th.bgTop, th.bgBottom, th.rim, th.tile]))),
          sec(t('premium'), premium),
        ),
      ),
    );
  }

  settings() {
    const s = this.profile.settings;
    const row = (label: string, value: string, onclick: () => void) =>
      h('button.set-row', { onclick: () => (sfx.tap(), onclick()) }, h('span', label), h('span.set-val', value));
    const apply = () => {
      configureFeedback(s.sound, s.haptics);
      this.save();
      this.settings();
    };
    this.mount(
      h(
        'div.panel',
        this.topBar(t('settings'), () => this.home()),
        h(
          'div.scroll.settings',
          row(t('language'), s.lang === 'he' ? 'עברית' : 'English', () => {
            s.lang = s.lang === 'he' ? 'en' : 'he';
            this.profile.langChosen = true;
            setLang(s.lang);
            apply();
          }),
          row(t('sound'), s.sound ? t('on') : t('off'), () => ((s.sound = !s.sound), apply())),
          row(t('haptics'), s.haptics ? t('on') : t('off'), () => ((s.haptics = !s.haptics), apply())),
          row(t('quality'), s.quality === 'high' ? t('qHigh') : t('qLow'), () => {
            s.quality = s.quality === 'high' ? 'low' : 'high';
            this.scene.setQuality(s.quality);
            apply();
          }),
          h(
            'button.set-row.danger',
            {
              onclick: () =>
                this.confirm(t('confirmReset'), () => {
                  this.profile = defaultProfile();
                  this.profile.settings = s;
                  this.save();
                  this.scene.setSkin(this.profile.equippedSkin);
                  this.scene.setTheme(this.profile.equippedTheme);
                  this.home();
                }),
            },
            t('resetProgress'),
          ),
          h('div.version', `${t('gameName')} v0.2`),
        ),
      ),
    );
  }

  // ---------- starting levels ----------

  startCampaign(pack: string, index: number) {
    const lv = packLevels(pack)[index];
    const w = WORLDS.find((x) => x.id === pack)!;
    const begin = () => this.begin({ mode: 'campaign', pack, index, level: lv, session: new Session(lv), ended: false });
    if (index === 0 && !this.profile.seenIntros.includes(pack)) {
      this.profile.seenIntros.push(pack);
      this.save();
      this.intro(w.intro.icon, tr(w.intro.title), tr(w.intro.body), w.color, begin);
    } else begin();
  }

  startChallenge(id: ChallengeId, index: number) {
    const lv = packLevels(id)[index];
    const session = new Session(lv, { timeLimit: id === 'clock' ? lv.time : undefined, fog: id === 'fog' });
    const go = () => this.begin({ mode: id, pack: id, index, level: lv, session, ended: false });
    const c = CHALLENGES.find((x) => x.id === id)!;
    if (index === 0 && !this.profile.seenIntros.includes(id)) {
      this.profile.seenIntros.push(id);
      this.save();
      this.intro(c.icon, tr(c.name), tr(c.desc) + (id === 'fog' ? ` — ${t('tapToReveal')}` : ''), c.color, go);
    } else go();
  }

  startDaily() {
    const lv = dailyLevel();
    if (this.profile.dailyLastDay === dayIndex()) this.toast(t('dailyDone'));
    this.begin({ mode: 'daily', pack: 'daily', index: 0, level: lv, session: new Session(lv), ended: false });
  }

  startRush() {
    const pool = packLevels('rush');
    const order = pool.map((_, i) => i).sort(() => Math.random() - 0.5);
    const lv = pool[order[0]];
    this.begin({ mode: 'rush', pack: 'rush', index: order[0], level: lv, session: new Session(lv), rush: { score: 0, timeLeft: RUSH_SECONDS, order, cursor: 0 }, ended: false });
  }

  private begin(play: Play) {
    this.play = play;
    this.scene.setMode('play');
    this.scene.insets = { top: 150, bottom: 130 };
    this.scene.load(play.session, play.mode === 'fog');
    this.gameHud();
    if (play.mode === 'campaign' && play.pack === 'w1' && play.index === 0) {
      this.toast(t('tutDrag'), 3500);
      setTimeout(() => this.tutorialHand(play), 1300);
    }
  }

  private titleFor(p: Play) {
    if (p.mode === 'campaign') return `${tr(WORLDS.find((w) => w.id === p.pack)!.name)} · ${p.index + 1}`;
    if (p.mode === 'daily') return t('daily');
    const c = CHALLENGES.find((x) => x.id === p.mode)!;
    return p.mode === 'rush' ? tr(c.name) : `${tr(c.name)} · ${p.index + 1}`;
  }

  private exitGame() {
    const p = this.play;
    this.play = null;
    if (!p) return this.home();
    if (p.mode === 'campaign') this.levels(p.pack);
    else if (p.mode === 'daily') this.home();
    else if (p.mode === 'rush') this.challenges();
    else this.levels(p.pack);
  }

  private gameHud() {
    const p = this.play!;
    const moves = h('div.moves-num');
    const bar = h('div.mbar-fill');
    const par = h('div.mbar-par');
    const stars = h('div.hud-stars');
    const timer = p.session.timeLeft !== null || p.rush ? h('div.pill.timer') : null;
    const hint = h('button.ctrl', { onclick: () => this.hint() }, h('span.cico', '💡'), h('span.clbl', `${t('hint')} ◉${HINT_COST}`));
    const el = h(
      'div.game',
      h(
        'div.hud-head',
        this.topBar(this.titleFor(p), () => (sfx.tap(), this.exitGame())),
        h(
        'div.hud-row',
        h('div.moves', h('div.moves-lbl', t('moves')), moves, h('div.mbar', bar, par)),
        stars,
        timer,
        p.rush ? h('div.pill.score', `${t('score')} `, h('b.rush-score', String(p.rush.score))) : null,
        ),
      ),
      h(
        'div.controls',
        h('button.ctrl', { onclick: () => this.undo() }, h('span.cico', '↶'), h('span.clbl', t('undo'))),
        h('button.ctrl', { onclick: () => this.restart() }, h('span.cico', '⟲'), h('span.clbl', t('restart'))),
        hint,
      ),
    );
    this.mount(el, 'game-screen');
    this.hud = { moves, bar, par, stars, timer, hint };
    this.updateHud();
  }

  private updateHud() {
    const p = this.play;
    if (!p || !this.hud) return;
    const s = p.session;
    this.hud.moves.textContent = `${s.moves} / ${s.maxMoves}`;
    this.hud.bar.style.width = `${Math.min(100, (s.moves / s.maxMoves) * 100)}%`;
    this.hud.par.style.left = `${(p.level.opt / s.maxMoves) * 100}%`;
    this.hud.bar.classList.toggle('warn', s.movesLeft <= 2);
    const st = s.moves === 0 ? 3 : starsFor(p.level, Math.max(s.moves, 0));
    this.hud.stars.replaceChildren(starsRow(st));
    const tl = p.rush ? p.rush.timeLeft : s.timeLeft;
    if (this.hud.timer && tl !== null) {
      const sec = Math.ceil(tl);
      this.hud.timer.textContent = `⏱ ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      this.hud.timer.classList.toggle('warn', sec <= 10);
    }
    const rs = this.screen?.querySelector('.rush-score');
    if (rs && p.rush) rs.textContent = String(p.rush.score);
  }

  // ---------- gameplay ----------

  private onMove(mv: Move) {
    const p = this.play;
    if (!p || p.ended) return null;
    const res = p.session.play(mv);
    if (!res) return null;
    sfx.move();
    if (res.flips) {
      sfx.flip();
      this.scene.padFlash();
    }
    if (res.exited.length) sfx.exit();
    this.scene.syncAnimated(res.exited);
    this.updateHud();
    if (p.session.status === 'won') this.won();
    else if (p.session.status === 'failed') {
      if (p.rush) {
        // Rush keeps the clock running: reset this puzzle instead of ending the run.
        this.toast(t('outOfMoves'), 1200);
        setTimeout(() => {
          if (this.play !== p || p.ended) return;
          p.session.restart();
          this.scene.syncInstant();
          this.updateHud();
        }, 500);
      } else setTimeout(() => this.failed(), 350);
    }
    return res;
  }

  private undo() {
    const p = this.play;
    if (!p || p.ended) return;
    if (p.session.undo()) {
      sfx.tap();
      this.scene.syncAnimated();
      this.updateHud();
    }
  }

  private restart() {
    const p = this.play;
    if (!p || p.ended) return;
    sfx.tap();
    p.session.restart();
    this.scene.syncInstant();
    this.updateHud();
  }

  private hint() {
    const p = this.play;
    if (!p || p.ended || p.session.status !== 'playing') return;
    if (this.profile.coins < HINT_COST) return this.toast(t('notEnough'));
    this.worker ??= new Worker(new URL('../hint.worker.ts', import.meta.url), { type: 'module' });
    const id = ++this.hintReq;
    const session = p.session;
    this.worker.onmessage = (e: MessageEvent<{ id: number; path: Move[] | null }>) => {
      if (e.data.id !== this.hintReq || this.play?.session !== session) return;
      const path = e.data.path;
      if (!path || path.length > session.movesLeft) return this.toast(t('hintNoWay'), 3000);
      this.profile.coins -= HINT_COST;
      this.save();
      this.scene.showHint(path[0]);
      const pill = this.screen?.querySelector('.coins');
      if (pill) pill.replaceWith(this.coinPill());
    };
    this.worker.postMessage({ id, level: p.level, state: Array.from(session.state) });
  }

  private tick(dt: number) {
    const p = this.play;
    if (!p || p.ended) return;
    if (p.rush) {
      p.rush.timeLeft = Math.max(0, p.rush.timeLeft - dt);
      if (p.rush.timeLeft === 0) {
        p.ended = true;
        this.rushOver();
        return;
      }
    } else {
      p.session.tick(dt);
      if (p.session.status === 'failed' && p.session.failReason === 'time') {
        p.ended = true;
        this.failed();
        return;
      }
    }
    const tl = p.rush ? p.rush.timeLeft : p.session.timeLeft;
    if (tl !== null) {
      const sec = Math.ceil(tl);
      if (sec !== this.lastSecond) {
        this.lastSecond = sec;
        if (sec <= 10) sfx.tick();
        this.updateHud();
      }
    }
  }

  private won() {
    const p = this.play!;
    if (p.rush) {
      p.rush.score++;
      this.updateHud();
      this.scene.celebrate();
      setTimeout(() => {
        if (this.play !== p || p.ended) return;
        p.rush!.cursor = (p.rush!.cursor + 1) % p.rush!.order.length;
        const idx = p.rush!.order[p.rush!.cursor];
        p.level = packLevels('rush')[idx];
        p.session = new Session(p.level);
        this.scene.load(p.session);
        this.updateHud();
      }, 900);
      return;
    }
    p.ended = true;
    const s = p.session;
    const stars = starsFor(p.level, s.moves);
    const prev = this.profile.stars[p.level.id] ?? 0;
    let coins = Math.max(0, stars - prev) * 10 + (prev ? 0 : 5);
    if (p.mode === 'daily' && this.profile.dailyLastDay !== dayIndex()) {
      const today = dayIndex();
      this.profile.dailyStreak = this.profile.dailyLastDay === today - 1 ? this.profile.dailyStreak + 1 : 1;
      this.profile.dailyLastDay = today;
      coins += 40 + Math.min(this.profile.dailyStreak, 7) * 10;
    }
    if (p.mode !== 'daily') {
      this.profile.stars[p.level.id] = Math.max(prev, stars);
      this.profile.bestMoves[p.level.id] = Math.min(this.profile.bestMoves[p.level.id] ?? 999, s.moves);
    }
    this.profile.coins += coins;
    this.save();
    setTimeout(() => {
      this.scene.celebrate();
      sfx.win();
      this.winModal(stars, coins);
    }, 650);
  }

  private hasNext(p: Play) {
    if (p.mode === 'daily') return false;
    const lv = packLevels(p.pack);
    if (p.index + 1 < lv.length) return true;
    if (p.mode === 'campaign') return WORLDS.findIndex((w) => w.id === p.pack) < WORLDS.length - 1;
    return false;
  }

  private next(p: Play) {
    const lv = packLevels(p.pack);
    if (p.index + 1 < lv.length) {
      if (p.mode === 'campaign') this.startCampaign(p.pack, p.index + 1);
      else this.startChallenge(p.mode as ChallengeId, p.index + 1);
    } else {
      const wi = WORLDS.findIndex((w) => w.id === p.pack);
      this.startCampaign(WORLDS[wi + 1].id, 0);
    }
  }

  private retry(p: Play) {
    if (p.mode === 'campaign') this.startCampaign(p.pack, p.index);
    else if (p.mode === 'daily') this.startDaily();
    else if (p.mode === 'rush') this.startRush();
    else this.startChallenge(p.mode, p.index);
  }

  private winModal(stars: number, coins: number) {
    const p = this.play!;
    const s = p.session;
    const starEls = h('div.big-stars', ...[0, 1, 2].map((i) => h('span.bstar', { 'data-i': i }, '★')));
    const m = this.modal(
      h('div.win-title', stars === 3 ? t('perfect') : t('solved')),
      starEls,
      h('div.win-stats', h('div', h('small', t('moves')), h('b', String(s.moves))), h('div', h('small', t('best')), h('b', String(p.level.opt))), h('div', h('small', t('reward')), h('b', `◉ ${coins}`))),
      p.mode === 'daily' ? h('div.streak', `🔥 ${t('streak')}: ${this.profile.dailyStreak}`) : null,
      h(
        'div.modal-actions',
        h('button.btn.ghost', { onclick: () => (close(), this.exitGame()) }, t('menu')),
        h('button.btn.ghost', { onclick: () => (close(), this.retry(p)) }, t('retry')),
        this.hasNext(p) ? h('button.btn.primary', { onclick: () => (close(), this.next(p)) }, t('next')) : null,
      ),
    );
    const close = () => m.remove();
    starEls.querySelectorAll('.bstar').forEach((el, i) => {
      if (i < stars)
        setTimeout(() => {
          el.classList.add('on');
          sfx.star(i);
        }, 350 + i * 260);
    });
  }

  private failed() {
    const p = this.play;
    if (!p) return;
    p.ended = true;
    sfx.fail();
    const byTime = p.session.failReason === 'time';
    const m = this.modal(
      h('div.fail-ico', byTime ? '⏱' : '⛓'),
      h('div.win-title', byTime ? t('outOfTime') : t('outOfMoves')),
      h(
        'div.modal-actions',
        h('button.btn.ghost', { onclick: () => (close(), this.exitGame()) }, t('menu')),
        !byTime
          ? h(
              'button.btn.ghost',
              {
                onclick: () => {
                  if (this.profile.coins < EXTRA_MOVES_COST) return this.toast(t('notEnough'));
                  this.profile.coins -= EXTRA_MOVES_COST;
                  this.save();
                  p.session.addMoves(5);
                  p.ended = false;
                  close();
                  this.updateHud();
                },
              },
              `${t('extraMoves')} ◉${EXTRA_MOVES_COST}`,
            )
          : null,
        h('button.btn.primary', { onclick: () => (close(), this.retry(p)) }, t('retry')),
      ),
    );
    const close = () => m.remove();
  }

  private rushOver() {
    const p = this.play!;
    const score = p.rush!.score;
    const best = Math.max(this.profile.rushBest, score);
    const coins = score * 8;
    this.profile.rushBest = best;
    this.profile.coins += coins;
    this.save();
    sfx.win();
    const m = this.modal(
      h('div.fail-ico', '⚡'),
      h('div.win-title', t('rushOver')),
      h('div.win-stats', h('div', h('small', t('score')), h('b', String(score))), h('div', h('small', t('bestScore')), h('b', String(best))), h('div', h('small', t('reward')), h('b', `◉ ${coins}`))),
      h(
        'div.modal-actions',
        h('button.btn.ghost', { onclick: () => (close(), this.exitGame()) }, t('menu')),
        h('button.btn.primary', { onclick: () => (close(), this.startRush()) }, t('retry')),
      ),
    );
    const close = () => m.remove();
  }

  // ---------- overlays ----------

  /** Animated finger showing the first drag; disappears on the first move. */
  private tutorialHand(play: Play) {
    if (this.play !== play || play.session.moves > 0) return;
    const pts = this.scene.screenHints();
    if (!pts) return;
    const hand = h('div.tut-hand', { style: `--x0:${pts.gold.x}px;--y0:${pts.gold.y}px;--x1:${pts.exit.x - 20}px;--y1:${pts.exit.y}px` }, '👆');
    this.screen?.append(hand);
    const stop = setInterval(() => {
      if (this.play !== play || play.session.moves > 0) {
        hand.remove();
        clearInterval(stop);
      }
    }, 200);
  }

  private modal(...children: (HTMLElement | null)[]) {
    const m = h('div.modal-back', h('div.modal', ...children));
    this.ui.append(m);
    requestAnimationFrame(() => m.classList.add('in'));
    return m;
  }

  private intro(icon: string, title: string, body: string, color: string, done: () => void) {
    const m = this.modal(
      h('div.intro-badge', { style: `--accent:${color}` }, icon),
      h('div.intro-kicker', t('newMechanic')),
      h('div.win-title', title),
      h('p.intro-body', body),
      h('div.modal-actions', h('button.btn.primary', { onclick: () => (sfx.tap(), m.remove(), done()) }, t('gotIt'))),
    );
  }

  private confirm(msg: string, yes: () => void) {
    const m = this.modal(
      h('div.win-title', msg),
      h(
        'div.modal-actions',
        h('button.btn.ghost', { onclick: () => m.remove() }, t('back')),
        h('button.btn.primary.danger', { onclick: () => (m.remove(), yes()) }, t('confirm')),
      ),
    );
  }

  toast(msg: string, ms = 2000) {
    const el = h('div.toast', msg);
    this.ui.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }
}
