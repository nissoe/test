// תוצאות כשידור: קרב אחרי קרב. פעמון, מסך VS, כוכבים שמתמלאים, מנצח, ואז סיכום התוכנית.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { endSeason, isSeasonOver } from '../../../engine/src/game.ts';
import type { MatchResult } from '../../../engine/src/types.ts';
import { brandInfo, content } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Display, FadeIn, GLASS, Head, Num, Panel, Plate, Portrait, Row, Stage, Stars, T, shade, wName } from '../ui.tsx';
import { arena } from '../arena/arena.ts';
import * as sfx from '../sfx.ts';

export function Results() {
  const { t, lang, game, setPhase } = useStore();
  const g = game!;
  const st = g.state;
  const res = g.lastResults;
  const mine = res.find((r) => r.brand === g.playerId)!;
  const info = brandInfo(g.playerId);
  const order = { opener: 0, midcard: 1, main: 2 } as const;
  const matches = [...mine.matches].sort((a, b) => order[a.match.slot] - order[b.match.slot]);
  const [step, setStep] = useState(0); // 0..matches.length-1 = קרב, matches.length = סיכום
  const done = step >= matches.length;

  const next = () => {
    if (isSeasonOver(st)) { endSeason(st); sfx.fanfare(); setPhase('seasonEnd'); }
    else setPhase('hub');
  };

  useEffect(() => { arena.shot('ring'); arena.hype(mine.isPle ? 0.6 : 0.4); }, []);
  return (
    <Stage arenaShare={0.3} width={600}>
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 60 }}>
      <LinearGradient colors={mine.isPle ? [C.goldLo + 'e6', '#1A1206e6', '#0A0C12e6'] : [shade(info.color, -0.4) + 'e6', '#0A0C12e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ ...GLASS, borderRadius: 4, padding: 14, borderWidth: 1, borderColor: mine.isPle ? C.gold : info.color + '66' }}>
        <Head size={12} color="#ffffffaa">{t('tonight')} · {t('week')} {mine.week}</Head>
        <Display size={34} color="#fff" glow={mine.isPle ? C.gold : info.color} style={{ fontStyle: 'italic' }}>{mine.pleName ?? info.name.toUpperCase()}</Display>
        {!done ? <T size={12} color="#ffffffaa">{t('matchOf')} {step + 1}/{matches.length}</T> : null}
      </LinearGradient>

      {matches.slice(0, step).map((m, i) => <MatchLine key={i} m={m} />)}

      {!done ? (
        <MatchReveal key={step} m={matches[step]} color={info.color} isLast={step === matches.length - 1} onNext={() => setStep(step + 1)} onSkip={() => setStep(matches.length)} />
      ) : (
        <Summary />
      )}

      {done ? <Btn label={t('continue')} onPress={next} /> : null}
    </ScrollView>
    </Stage>
  );
}

/** קרב אחד בהצגה מלאה */
function MatchReveal({ m, color, onNext, onSkip, isLast }: { m: MatchResult; color: string; onNext: () => void; onSkip: () => void; isLast: boolean }) {
  const { t, lang, game } = useStore();
  const st = game!.state;
  const [phase, setPhase] = useState<'vs' | 'stars' | 'winner'>('vs');
  const slam = useRef(new Animated.Value(0)).current;
  const a = st.wrestlers[m.match.sides[0][0]];
  const b = st.wrestlers[m.match.sides[1][0]];
  const isMain = m.match.slot === 'main';
  const stip = content.stipulations.find((s) => s.name === m.match.stipulation);

  useEffect(() => {
    const last = (w: typeof a) => w.name.split(' ').slice(-1)[0].toUpperCase();
    arena.shot(isMain ? 'ringside' : 'ring');
    arena.screen({ kicker: isMain ? 'Main Event' : m.match.slot === 'opener' ? 'Opener' : 'Midcard', title: `${last(a)} VS ${last(b)}`, subtitle: m.match.stipulation + (m.match.titleId ? ' · Title' : ''), color });
    arena.pop(isMain ? 0.6 : 0.3);
    sfx.bell(isMain ? 3 : 2);
    sfx.crowd(isMain ? 0.6 : 0.35, 2.2);
    Animated.timing(slam, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
    const t1 = setTimeout(() => setPhase('stars'), 1500);
    const t2 = setTimeout(() => {
      setPhase('winner');
      sfx.crowd(Math.min(1, m.stars / 5), 3);
      arena.pop(Math.min(1, m.stars / 5));
      const wn = st.wrestlers[m.winners[0]];
      arena.screen({ kicker: m.newChampion ? 'And New Champion' : 'Winner', title: wn.name.toUpperCase(), subtitle: `${m.stars.toFixed(2)} stars`, color: m.newChampion ? '#B8860B' : color });
      if (m.newChampion || (isMain && m.stars >= 4)) arena.pyro();
      if (m.newChampion) sfx.fanfare();
    }, 1500 + Math.ceil(m.stars) * 260 + 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const side = (w: typeof a, i: number) => {
    const won = phase === 'winner' && m.winnerSide === i;
    const lost = phase === 'winner' && m.winnerSide !== i;
    return (
      <Animated.View style={{ flex: 1, alignItems: 'center', gap: 6, opacity: lost ? 0.4 : 1, transform: [{ translateX: slam.interpolate({ inputRange: [0, 1], outputRange: [i === 0 ? -80 : 80, 0] }) }] }}>
        <Portrait w={w} size={84} color={won ? C.gold : color} />
        <Display size={20} numberOfLines={2} style={{ textAlign: 'center' }} color={won ? C.goldHi : '#fff'}>{wName(w, lang)}</Display>
        {won ? <View style={{ alignItems: 'center' }}><Plate label={lang === 'he' ? 'מנצח' : 'WINNER'} /></View> : null}
      </Animated.View>
    );
  };

  return (
    <FadeIn>
      <LinearGradient colors={isMain ? ['#2A1F08e6', '#0E0B05e6', '#07080Ce6'] : [shade(color, -0.6) + 'e6', '#0A0C12e6']} style={{ ...GLASS, borderRadius: 4, padding: 16, gap: 14, borderWidth: isMain ? 2 : 1, borderColor: isMain ? C.gold : color + '66' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Plate label={isMain ? t('main') : m.match.slot === 'opener' ? t('opener') : t('midcard')} color={isMain ? C.gold : '#2A3142'} text={isMain ? '#1A1206' : '#fff'} />
          <Head size={13} color={C.gold}>{lang === 'he' ? stip?.nameHe ?? m.match.stipulation : m.match.stipulation}{m.match.titleId ? ' · 🏆' : ''}</Head>
        </Row>
        <Row wrap={false} gap={6} style={{ alignItems: 'flex-start' }}>
          {side(a, 0)}
          <Animated.View style={{ alignSelf: 'center', transform: [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [3, 1] }) }], opacity: slam }}>
            <Display size={40} color={C.gold} glow={C.gold} style={{ fontStyle: 'italic' }}>VS</Display>
          </Animated.View>
          {side(b, 1)}
        </Row>
        <View style={{ alignItems: 'center', minHeight: 30 }}>
          {phase !== 'vs' ? <Stars value={m.stars} size={30} animate onStar={(i) => sfx.star(i)} /> : null}
        </View>
        {phase === 'winner' ? (
          <FadeIn style={{ alignItems: 'center', gap: 4 }}>
            <T color={C.steel}>{wName(st.wrestlers[m.winners[0]], lang)} {t('wins')} <T bold color="#fff">{m.finisher}</T></T>
            {m.newChampion ? <Display size={24} color={C.goldHi} glow={C.gold}>🏆 {t('newChampion')}</Display> : null}
          </FadeIn>
        ) : null}
        <Row style={{ justifyContent: 'center' }}>
          <Btn small kind="ghost" label={t('skipAll')} onPress={onSkip} />
          <Btn small label={isLast ? t('finalRating') : t('nextMatch')} onPress={onNext} disabled={phase !== 'winner'} />
        </Row>
      </LinearGradient>
    </FadeIn>
  );
}

function MatchLine({ m }: { m: MatchResult }) {
  const { t, lang, game } = useStore();
  const st = game!.state;
  const name = (id: string) => wName(st.wrestlers[id], lang);
  return (
    <Panel pad={10}>
      <Row style={{ justifyContent: 'space-between' }} wrap={false}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Head size={11} color={C.muted}>{m.match.slot === 'main' ? t('main') : m.match.slot === 'opener' ? t('opener') : t('midcard')} · {m.match.stipulation}</Head>
          <Head size={15} numberOfLines={1} style={{ textTransform: 'none' }}>{m.match.sides.map((s) => s.map(name).join(' & ')).join(` ${t('vs')} `)}</Head>
          <T size={11} color={C.muted}>{name(m.winners[0])} · {m.finisher}{m.newChampion ? ' · 🏆' : ''}</T>
        </View>
        <Stars value={m.stars} size={14} />
      </Row>
    </Panel>
  );
}

function Summary() {
  const { t, lang, game } = useStore();
  const g = game!;
  const st = g.state;
  const mine = g.lastResults.find((r) => r.brand === g.playerId)!;
  const others = g.lastResults.filter((r) => r.brand !== g.playerId).sort((a, b) => b.rating - a.rating);
  const all = [...g.lastResults].sort((a, b) => b.rating - a.rating);
  const place = all.findIndex((r) => r.brand === g.playerId) + 1;
  useEffect(() => {
    sfx.crowd(Math.min(1, mine.rating / 5), 3);
    arena.shot('wide');
    arena.pop(Math.min(1, mine.rating / 5));
    arena.screen({ kicker: 'Final show rating', title: mine.rating.toFixed(2), subtitle: `#${place} of ${all.length}`, color: brandInfo(g.playerId).color });
  }, []);
  const name = (id: string) => wName(st.wrestlers[id], lang);
  return (
    <>
      <FadeIn>
        <LinearGradient colors={['#1F1808', '#0B0E16']} style={{ borderRadius: 4, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.gold + '88' }}>
          <Head size={13} color={C.gold}>{t('finalRating')}</Head>
          <Stars value={mine.rating} size={40} animate onStar={(i) => sfx.star(i)} />
          <Display size={48} color={C.goldHi} glow={C.gold}>{mine.rating.toFixed(2)}</Display>
          <View style={{ alignItems: 'center' }}><Plate label={`#${place} / ${all.length}`} /></View>
          <Row gap={18} style={{ justifyContent: 'center', marginTop: 6 }}>
            <Fig k={t('attendance')} v={mine.attendance.toLocaleString()} />
            <Fig k={t('revenue')} v={money(mine.revenue)} color={C.good} />
            <Fig k={t('costs')} v={money(mine.costs)} color={C.bad} />
            <Fig k={t('fansChange')} v={`${mine.fansGained >= 0 ? '+' : ''}${mine.fansGained.toLocaleString()}`} color={mine.fansGained >= 0 ? C.good : C.bad} />
          </Row>
        </LinearGradient>
      </FadeIn>

      {mine.injuries.length ? (
        <Panel accent={C.bad}>
          <Head size={13} color={C.bad}>{t('injuries')}</Head>
          <T>{mine.injuries.map((id) => `${name(id)} (${st.wrestlers[id].injuredWeeks} ${t('weeks')})`).join(' · ')}</T>
        </Panel>
      ) : null}

      <FadeIn delay={300}>
        <Panel>
          <Head size={14} color={C.muted}>{t('rivals')}</Head>
          {others.map((r) => {
            const b = brandInfo(r.brand);
            const main = r.matches.find((m) => m.match.slot === 'main');
            return (
              <Row key={r.brand} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }} wrap={false}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Display size={18} color={b.color} style={{ fontStyle: 'italic' }}>{b.name.toUpperCase()}</Display>
                  {main ? <T size={12} color={C.muted} numberOfLines={1}>{main.match.sides.map((s) => s.map(name).join(' & ')).join(` ${t('vs')} `)}{main.newChampion ? ' · 🏆' : ''}</T> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Stars value={r.rating} size={14} />
                  <Num size={14} color={C.muted}>{r.rating.toFixed(2)}</Num>
                </View>
              </Row>
            );
          })}
        </Panel>
      </FadeIn>
    </>
  );
}

function Fig({ k, v, color = '#fff' }: { k: string; v: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Head size={10} color={C.muted}>{k}</Head>
      <Num size={22} color={color}>{v}</Num>
    </View>
  );
}

export function SeasonEnd() {
  const { t, game, setPhase } = useStore();
  const st = game!.state;
  const rows = [...st.brands].sort((a, b) => b.fans - a.fans);
  useEffect(() => {
    sfx.crowd(1, 4);
    const w = brandInfo(rows[0].id);
    arena.brand(w.color, w.name);
    arena.shot('stage');
    arena.hype(0.9);
    arena.screen({ kicker: 'Season champions', title: w.name.toUpperCase(), subtitle: `${rows[0].fans.toLocaleString()} fans`, color: w.color });
    arena.pyro();
    const iv = setInterval(() => arena.pyro(), 2500);
    return () => clearInterval(iv);
  }, []);
  return (
    <Stage arenaShare={0.3} width={600}>
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
      <FadeIn style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Display size={52} color={C.goldHi} glow={C.gold} style={{ fontStyle: 'italic' }}>{t('seasonOver').toUpperCase()}</Display>
      </FadeIn>
      {rows.map((b, i) => {
        const info = brandInfo(b.id);
        const avg = b.showRatings.reduce((x, y) => x + y, 0) / Math.max(1, b.showRatings.length);
        return (
          <FadeIn key={b.id} delay={300 + i * 200}>
            <LinearGradient colors={i === 0 ? [C.goldLo, '#1A1206'] : [shade(info.color, -0.55), '#0D1019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 4, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? C.gold : C.line }}>
              <Display size={44} color={i === 0 ? C.goldHi : '#ffffff55'}>{i === 0 ? '🏆' : i + 1}</Display>
              <View style={{ flex: 1 }}>
                <Display size={26} color="#fff" style={{ fontStyle: 'italic' }}>{info.name.toUpperCase()}{b.id === game!.playerId ? ' ◀' : ''}</Display>
                <T size={12} color={C.muted}>{t('avgRating')} {avg.toFixed(2)}★ · {money(b.cash)}</T>
              </View>
              <Num size={22}>{b.fans.toLocaleString()}</Num>
            </LinearGradient>
          </FadeIn>
        );
      })}
      <Btn label={t('playAgain')} onPress={() => setPhase('setup')} />
    </ScrollView>
    </Stage>
  );
}
