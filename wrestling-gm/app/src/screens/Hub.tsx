// המסך השבועי: לוח שידור עליון, בניית כרטיס הקרבות, רוסטר, דירוג ותארים.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { aiPlanShow, isStipUnlocked, pleWeeks, slotsFor } from '../../../engine/src/ai.ts';
import { advanceWeek } from '../../../engine/src/game.ts';
import { CONFIG } from '../../../engine/src/config.ts';
import type { BookedPromo, ShowPlan, Slot, Wrestler } from '../../../engine/src/types.ts';
import { brandInfo, content, singlesStips } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Bar, Btn, C, Chip, Display, FadeIn, GLASS, Head, Mic, Num, Panel, Plate, Portrait, Row, Stage, T, shade, wName, wTags } from '../ui.tsx';
import { arena } from '../arena/arena.ts';
import * as sfx from '../sfx.ts';

type Tab = 'book' | 'roster' | 'standings' | 'titles';
interface MatchDraft { slot: Slot; a: string | null; b: string | null; stip: string; title: boolean }
interface PromoDraft { w: string | null; kind: BookedPromo['kind'] }

export function Hub() {
  const { t, game } = useStore();
  const [tab, setTab] = useState<Tab>('book');
  const st = game!.state;
  const me = st.brands.find((b) => b.id === game!.playerId)!;
  const info = brandInfo(me.id);
  const ples = pleWeeks(st);
  const isPle = ples.includes(st.week);
  const nextPle = ples.find((w) => w >= st.week);
  const pleName = nextPle ? CONFIG.pleNames[ples.indexOf(nextPle)] : null;
  const rank = [...st.brands].sort((a, b) => b.fans - a.fans).findIndex((b) => b.id === me.id) + 1;
  useEffect(() => {
    arena.brand(info.color, info.name);
    arena.shot('wide');
    arena.hype(isPle ? 0.6 : 0.3);
    arena.screen({ kicker: `${t('week')} ${st.week}`, title: isPle && pleName ? pleName.toUpperCase() : info.name.toUpperCase(), subtitle: isPle ? 'Premium Live Event' : pleName ? `Next: ${pleName}` : undefined, color: isPle ? '#B8860B' : info.color });
  }, [st.week]);

  return (
    <Stage arenaShare={0.22} width={620}>
    <View style={{ flex: 1, gap: 8 }}>
      <LinearGradient colors={[shade(info.color, -0.3) + 'e6', shade(info.color, -0.8) + 'e6', '#0A0C12e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ ...GLASS, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: info.color + '66', overflow: 'hidden' }}>
        <Display size={90} color="#ffffff08" style={{ position: 'absolute', right: -10, top: -20, fontStyle: 'italic' }}>{info.name.toUpperCase()}</Display>
        <Row style={{ justifyContent: 'space-between' }}>
          <Display size={26} color="#fff" glow={info.color} style={{ fontStyle: 'italic' }}>{info.name.toUpperCase()}</Display>
          <Plate label={`${t('week')} ${st.week}/${st.settings.seasonWeeks}`} color="#ffffffdd" size={12} />
        </Row>
        <Row gap={16}>
          <Stat k={t('cash')} v={money(me.cash)} color={C.gold} />
          <Stat k={t('fans')} v={me.fans.toLocaleString()} />
          <Stat k={t('standings')} v={`#${rank}`} />
        </Row>
        {pleName ? (
          <Row gap={6}>
            <Head size={11} color={isPle ? C.gold : '#ffffff99'}>{isPle ? t('thisWeekPle') : `${t('nextPle')} · ${t('week')} ${nextPle}`}</Head>
            <Head size={15} italic color={isPle ? C.goldHi : '#fff'} style={{ textTransform: 'none' }}>{pleName}</Head>
          </Row>
        ) : null}
        <Row gap={6}>
          {(['book', 'roster', 'standings', 'titles'] as Tab[]).map((k) => (
            <Chip key={k} label={k === 'book' ? t('bookShow') : t(k)} active={tab === k} color="#fff" onPress={() => setTab(k)} />
          ))}
        </Row>
      </LinearGradient>
      {tab === 'book' ? <Booking /> : tab === 'roster' ? <RosterView /> : tab === 'standings' ? <Standings /> : <Titles />}
    </View>
    </Stage>
  );
}

function Stat({ k, v, color = '#fff' }: { k: string; v: string; color?: string }) {
  return (
    <View>
      <Head size={11} color="#ffffff99">{k}</Head>
      <Num size={20} color={color}>{v}</Num>
    </View>
  );
}

function Booking() {
  const { t, lang, game, setPhase } = useStore();
  const g = game!;
  const st = g.state;
  const me = st.brands.find((b) => b.id === g.playerId)!;
  const info = brandInfo(me.id);
  const isPle = pleWeeks(st).includes(st.week);
  const slots = slotsFor(st, content, st.week);
  const baseSlots = content.difficulty.find((d) => d.name === st.settings.difficulty)?.matches ?? 0;

  const emptyCard = (): { venue: string; matches: MatchDraft[]; promos: PromoDraft[] } => {
    const order: Slot[] = ['opener', ...Array<Slot>(Math.max(0, slots.matches - 2)).fill('midcard'), 'main'];
    return {
      venue: content.venues[0].tier,
      matches: order.map((slot) => ({ slot, a: null, b: null, stip: 'Standard', title: false })),
      promos: Array.from({ length: slots.promos }, () => ({ w: null, kind: 'Self-Promo' as const })),
    };
  };
  const [card, setCard] = useState(emptyCard);
  const [picker, setPicker] = useState<null | { kind: 'match'; i: number; side: 'a' | 'b' } | { kind: 'promo'; i: number } | { kind: 'stip'; i: number }>(null);
  useEffect(() => setCard(emptyCard()), [st.week]);

  const W = (id: string | null) => (id ? st.wrestlers[id] : null);
  const inMatches = new Set(card.matches.flatMap((m) => [m.a, m.b]).filter(Boolean) as string[]);
  const inPromos = new Set(card.promos.map((p) => p.w).filter(Boolean) as string[]);

  const titleFor = (m: MatchDraft) => {
    if (!m.a || !m.b) return null;
    const a = st.wrestlers[m.a], b = st.wrestlers[m.b];
    if (a.gender !== b.gender) return null;
    return me.titles.find((ti) => ti.holder === a.id || ti.holder === b.id) ?? null;
  };

  const autoBook = () => {
    const plan = aiPlanShow(me, st, content, g.rng);
    const next = emptyCard();
    next.venue = plan.venueTier;
    const queue = { opener: plan.matches.filter((m) => m.slot === 'opener'), midcard: plan.matches.filter((m) => m.slot === 'midcard'), main: plan.matches.filter((m) => m.slot === 'main') };
    next.matches = next.matches.map((m) => {
      const pm = queue[m.slot].shift();
      return pm ? { slot: m.slot, a: pm.sides[0][0], b: pm.sides[1][0], stip: pm.stipulation, title: !!pm.titleId } : m;
    });
    next.promos = next.promos.map((p, i) => (plan.promos[i] ? { w: plan.promos[i].wrestlers[0], kind: plan.promos[i].kind } : p));
    sfx.whoosh();
    setCard(next);
  };

  const venue = content.venues.find((v) => v.tier === card.venue)!;
  const filled = card.matches.filter((m) => m.a && m.b);
  const cost = useMemo(() => {
    let c = venue.cost + (isPle ? 50000 : 0);
    for (const m of filled) c += ((content.stipulations.find((s) => s.name === m.stip)?.costTier ?? 1) - 1) * CONFIG.economy.stipCostPerTier;
    for (const p of card.promos) if (p.w) c += CONFIG.economy.promoCost[p.kind] ?? 0;
    return c;
  }, [card, venue, isPle]);
  const ready = card.matches.some((m) => m.slot === 'main' && m.a && m.b) && card.matches.some((m) => m.slot === 'opener' && m.a && m.b);

  const run = () => {
    const plan: ShowPlan = {
      venueTier: card.venue,
      matches: filled.map((m) => ({ slot: m.slot, sides: [[m.a!], [m.b!]], stipulation: m.stip, titleId: m.title ? titleFor(m)?.id ?? null : null })),
      promos: card.promos.filter((p) => p.w).map((p) => ({ kind: p.kind, wrestlers: [p.w!] })),
    };
    g.lastResults = advanceWeek(st, content, g.rng, { [me.id]: plan });
    if (isPle) { sfx.fanfare(); arena.pyro(); } else sfx.whoosh();
    setPhase('results');
  };

  const setMatch = (i: number, patch: Partial<MatchDraft>) => setCard((c) => ({ ...c, matches: c.matches.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const setPromo = (i: number, patch: Partial<PromoDraft>) => setCard((c) => ({ ...c, promos: c.promos.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const slotLabel = (s: Slot) => (s === 'main' ? t('main') : s === 'opener' ? t('opener') : t('midcard'));
  const stipLabel = (name: string) => { const s = content.stipulations.find((x) => x.name === name); return lang === 'he' ? s?.nameHe ?? name : name; };

  const roster = me.roster.map((id) => st.wrestlers[id]);
  const pickerList: Wrestler[] = !picker || picker.kind === 'stip' ? [] : roster
    .filter((w) => (picker.kind === 'match' ? !inMatches.has(w.id) : !inPromos.has(w.id)))
    .filter((w) => {
      if (picker.kind !== 'match') return true;
      const other = W(card.matches[picker.i][picker.side === 'a' ? 'b' : 'a']);
      return !other || other.gender === w.gender;
    })
    .sort((a, b) => b.popularity - a.popularity);

  return (
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 110 }}>
      {slots.matches > baseSlots && !isPle ? <Plate label={t('goHome')} /> : null}

      <Panel pad={10}>
        <Head size={13} color={C.muted}>{t('venue')}</Head>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {content.venues.map((v) => {
            const active = card.venue === v.tier;
            const affordable = v.cost <= me.cash;
            return (
              <Pressable key={v.tier} disabled={!affordable} onPress={() => { sfx.click(); setCard((c) => ({ ...c, venue: v.tier })); }}>
                <LinearGradient colors={active ? [shade(info.color, -0.2), shade(info.color, -0.75)] : ['#171C29', '#0D1018']}
                  style={{ width: 150, padding: 10, borderRadius: 3, borderWidth: active ? 2 : 1, borderColor: active ? info.color : C.line, opacity: affordable ? 1 : 0.35, gap: 2 }}>
                  <Head size={14} numberOfLines={1} style={{ textTransform: 'none' }}>{lang === 'he' ? v.tierHe ?? v.tier : v.tier}</Head>
                  <Num size={18} color={C.gold}>{v.cost ? money(v.cost) : t('free')}</Num>
                  <T size={11} color="#ffffffaa">{(v.capacity + (isPle ? 5000 : 0)).toLocaleString()} · ${v.ticket + (isPle ? 2 : 0)} · +{v.quality + (isPle ? 5 : 0)}%</T>
                </LinearGradient>
              </Pressable>
            );
          })}
        </ScrollView>
      </Panel>

      {card.matches.map((m, i) => {
        const title = titleFor(m);
        const isMain = m.slot === 'main';
        return (
          <FadeIn key={`${st.week}-${i}`} delay={i * 50}>
            <Panel accent={isMain ? C.gold : info.color} pad={10} style={isMain ? { borderColor: C.gold + '88' } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Plate label={slotLabel(m.slot)} color={isMain ? C.gold : '#2A3142'} text={isMain ? '#1A1206' : '#fff'} />
                <Pressable onPress={() => { sfx.click(); setPicker({ kind: 'stip', i }); }}>
                  <Head size={13} color={C.gold}>{stipLabel(m.stip)} ▾</Head>
                </Pressable>
              </Row>
              <Row gap={8} wrap={false}>
                <Slotbox w={W(m.a)} color={info.color} onPress={() => setPicker({ kind: 'match', i, side: 'a' })} onClear={() => setMatch(i, { a: null, title: false })} />
                <Display size={22} color={C.gold} style={{ fontStyle: 'italic' }}>VS</Display>
                <Slotbox w={W(m.b)} color={info.color} onPress={() => setPicker({ kind: 'match', i, side: 'b' })} onClear={() => setMatch(i, { b: null, title: false })} />
              </Row>
              {title ? <Chip label={`🏆 ${title.name}`} active={m.title} onPress={() => setMatch(i, { title: !m.title })} /> : null}
            </Panel>
          </FadeIn>
        );
      })}

      {card.promos.map((p, i) => (
        <Panel key={`p${i}`} pad={10}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Plate label={`${t('promo')} ${i + 1}`} color="#2A3142" text="#fff" />
            <Row gap={6}>
              <Chip label={t('selfPromo')} active={p.kind === 'Self-Promo'} onPress={() => setPromo(i, { kind: 'Self-Promo' })} />
              <Chip label={t('training')} active={p.kind === 'Training'} onPress={() => setPromo(i, { kind: 'Training' })} />
            </Row>
          </Row>
          <Slotbox w={W(p.w)} color={info.color} onPress={() => setPicker({ kind: 'promo', i })} onClear={() => setPromo(i, { w: null })} />
        </Panel>
      ))}

      <Panel style={{ borderColor: info.color + '88' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Head size={11} color={C.muted}>{t('estCost')}</Head>
            <Num size={26} color={C.gold}>{money(cost)}</Num>
          </View>
          <Row>
            <Btn small kind="ghost" label={t('clear')} onPress={() => setCard(emptyCard())} />
            <Btn small kind="ghost" label={t('autoBook')} onPress={autoBook} />
          </Row>
        </Row>
        <Btn label={t('runShow')} onPress={run} disabled={!ready} />
        {!ready ? <T color={C.muted} size={12}>{t('needMain')}</T> : null}
      </Panel>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: '#000c', justifyContent: 'center', padding: 12, direction: lang === 'he' ? 'rtl' : 'ltr' }}>
          <Panel style={{ maxHeight: '88%', maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Head size={18}>{picker?.kind === 'stip' ? t('stip') : t('selectWrestler')}</Head>
              <Btn small kind="ghost" label={t('close')} onPress={() => setPicker(null)} />
            </Row>
            {picker?.kind === 'stip' ? (
              <ScrollView contentContainerStyle={{ gap: 6 }}>
                {singlesStips.map((s) => {
                  const open = isStipUnlocked(s, st.week, isPle);
                  return (
                    <Pressable key={s.name} disabled={!open} onPress={() => { sfx.click(); setMatch(picker.i, { stip: s.name }); setPicker(null); }} style={{ opacity: open ? 1 : 0.3 }}>
                      <View style={{ backgroundColor: '#0D1019', borderWidth: 1, borderColor: C.line, borderRadius: 3, padding: 10 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <Head size={15} style={{ textTransform: 'none' }}>{lang === 'he' ? s.nameHe ?? s.name : s.name}</Head>
                          <Num size={15} color={C.gold}>+{s.starBonus}★ · {money((s.costTier - 1) * CONFIG.economy.stipCostPerTier)}</Num>
                        </Row>
                        <T size={11} color={C.muted}>{t('stamina')}: {s.stamina}{open ? '' : ` · 🔒 ${s.unlock}`}</T>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <FlatList
                data={pickerList}
                keyExtractor={(w) => w.id}
                contentContainerStyle={{ gap: 6 }}
                renderItem={({ item: w }) => {
                  const hurt = w.injuredWeeks > 0;
                  return (
                    <Pressable disabled={hurt} style={{ opacity: hurt ? 0.35 : 1 }} onPress={() => {
                      if (!picker) return;
                      sfx.click();
                      if (picker.kind === 'match') setMatch(picker.i, { [picker.side]: w.id, title: false } as Partial<MatchDraft>);
                      else if (picker.kind === 'promo') setPromo(picker.i, { w: w.id });
                      setPicker(null);
                    }}>
                      <WrestlerLine w={w} />
                    </Pressable>
                  );
                }}
              />
            )}
          </Panel>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Slotbox({ w, onPress, onClear, color }: { w: Wrestler | null; onPress: () => void; onClear: () => void; color: string }) {
  const { t, lang } = useStore();
  return (
    <Pressable onPress={() => { sfx.click(); onPress(); }} style={{ flex: 1, minWidth: 0 }}>
      {w ? (
        <LinearGradient colors={[shade(color, -0.6), '#0D1019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 3, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: color + '55' }}>
          <Portrait w={w} size={38} color={color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Head size={15} numberOfLines={1} style={{ textTransform: 'none' }}>{wName(w, lang)}</Head>
            <T size={10} color={C.muted} numberOfLines={1}>{wTags(w, lang)}</T>
            <Row gap={4} wrap={false}><Head size={9} color={C.muted}>{t('stamina')}</Head><Bar value={w.stamina} max={w.maxStamina} height={4} /></Row>
          </View>
          <Pressable onPress={onClear} hitSlop={10}><T color={C.muted}>✕</T></Pressable>
        </LinearGradient>
      ) : (
        <View style={{ borderRadius: 3, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3A4256', padding: 14, alignItems: 'center', backgroundColor: '#0A0D14' }}>
          <Head size={13} color={C.muted}>+ {t('selectWrestler')}</Head>
        </View>
      )}
    </Pressable>
  );
}

function WrestlerLine({ w }: { w: Wrestler }) {
  const { t, lang, game } = useStore();
  const me = game!.state.brands.find((b) => b.id === game!.playerId)!;
  const info = brandInfo(me.id);
  const champ = me.titles.find((ti) => ti.holder === w.id);
  return (
    <LinearGradient colors={['#141927', '#0D1019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ borderRadius: 3, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: champ ? C.gold + '88' : C.line }}>
      <Portrait w={w} size={44} color={info.color} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Head size={16} numberOfLines={1} style={{ textTransform: 'none' }}>{champ ? '🏆 ' : ''}{wName(w, lang)}</Head>
        <T size={11} color={w.injuredWeeks > 0 ? C.bad : C.muted} numberOfLines={1}>{w.injuredWeeks > 0 ? `${t('injured')} · ${w.injuredWeeks} ${t('weeks')}` : `${wTags(w, lang)} · ${t('record')} ${w.wins}-${w.losses}`}</T>
        <Row gap={6} wrap={false}><Head size={9} color={C.muted}>{t('stamina')}</Head><Bar value={w.stamina} max={w.maxStamina} height={4} /><Head size={9} color={C.muted}>{t('morale')}</Head><Bar value={w.morale} height={4} /></Row>
      </View>
      <View style={{ alignItems: 'center' }}><Head size={9} color={C.muted}>{t('pop')}</Head><Num size={20}>{Math.round(w.popularity)}</Num></View>
      <View style={{ alignItems: 'center' }}><Head size={9} color={C.muted}>{t('ring')}</Head><Num size={20}>{Math.round(w.ringLevel)}</Num></View>
      <View style={{ alignItems: 'center', gap: 3 }}><Head size={9} color={C.muted}>{t('mic')}</Head><Mic value={w.mic} size={8} /></View>
    </LinearGradient>
  );
}

function RosterView() {
  const { game } = useStore();
  const st = game!.state;
  const me = st.brands.find((b) => b.id === game!.playerId)!;
  const roster = me.roster.map((id) => st.wrestlers[id]).sort((a, b) => b.popularity - a.popularity);
  return <FlatList data={roster} keyExtractor={(w) => w.id} contentContainerStyle={{ gap: 6, paddingBottom: 40 }} renderItem={({ item }) => <WrestlerLine w={item} />} />;
}

function Standings() {
  const { t, game } = useStore();
  const st = game!.state;
  const rows = [...st.brands].sort((a, b) => b.fans - a.fans);
  return (
    <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 40 }}>
      {rows.map((b, i) => {
        const info = brandInfo(b.id);
        const avg = b.showRatings.length ? b.showRatings.reduce((x, y) => x + y, 0) / b.showRatings.length : 0;
        const last = b.showRatings[b.showRatings.length - 1];
        return (
          <FadeIn key={b.id} delay={i * 80}>
            <LinearGradient colors={[shade(info.color, -0.5), '#0D1019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 3, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: b.id === game!.playerId ? 2 : 1, borderColor: b.id === game!.playerId ? info.color : C.line }}>
              <Display size={40} color={i === 0 ? C.gold : '#ffffff55'}>{i + 1}</Display>
              <View style={{ flex: 1 }}>
                <Display size={24} color="#fff" style={{ fontStyle: 'italic' }}>{info.name.toUpperCase()}</Display>
                <T size={12} color={C.muted}>{money(b.cash)} · {t('avgRating')} {avg.toFixed(2)}★{last != null ? ` · ${t('week')} ${st.week - 1}: ${last.toFixed(2)}★` : ''}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}><Head size={10} color={C.muted}>{t('fans')}</Head><Num size={22}>{b.fans.toLocaleString()}</Num></View>
            </LinearGradient>
          </FadeIn>
        );
      })}
    </ScrollView>
  );
}

function Titles() {
  const { t, lang, game } = useStore();
  const st = game!.state;
  return (
    <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 40 }}>
      {st.brands.map((b) => {
        const info = brandInfo(b.id);
        return (
          <Panel key={b.id} accent={info.color}>
            <Display size={22} color={info.color} style={{ fontStyle: 'italic' }}>{info.name.toUpperCase()}</Display>
            {b.titles.map((ti) => {
              const h = ti.holder ? st.wrestlers[ti.holder] : null;
              return (
                <Row key={ti.id} gap={10} wrap={false}>
                  {h ? <Portrait w={h} size={34} color={ti.kind === 'world' ? C.goldLo : info.color} /> : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Head size={12} color={ti.kind === 'world' ? C.gold : C.steel} numberOfLines={1}>{ti.name}</Head>
                    <Head size={16} style={{ textTransform: 'none' }}>{h ? wName(h, lang) : t('vacant')}</Head>
                  </View>
                  <Num size={14} color={C.muted}>{ti.weeksHeld} {t('weeks')}</Num>
                </Row>
              );
            })}
          </Panel>
        );
      })}
    </ScrollView>
  );
}
