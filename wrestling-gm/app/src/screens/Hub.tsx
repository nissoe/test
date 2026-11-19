// המסך השבועי: בניית תוכנית, רוסטר, דירוג ותארים.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { aiPlanShow, isStipUnlocked, pleWeeks, slotsFor } from '../../../engine/src/ai.ts';
import { advanceWeek } from '../../../engine/src/game.ts';
import { CONFIG } from '../../../engine/src/config.ts';
import type { BookedPromo, ShowPlan, Slot, Wrestler } from '../../../engine/src/types.ts';
import { brandInfo, content, singlesStips } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Bar, Btn, C, Card, H, Mic, Pill, Row, T, wName, wTags } from '../ui.tsx';

type Tab = 'book' | 'roster' | 'standings' | 'titles';
interface MatchDraft { slot: Slot; a: string | null; b: string | null; stip: string; title: boolean }
interface PromoDraft { w: string | null; kind: BookedPromo['kind'] }

export function Hub() {
  const { t, lang, game } = useStore();
  const [tab, setTab] = useState<Tab>('book');
  const st = game!.state;
  const me = st.brands.find((b) => b.id === game!.playerId)!;
  const info = brandInfo(me.id);
  const ples = pleWeeks(st);
  const isPle = ples.includes(st.week);
  const nextPle = ples.find((w) => w >= st.week);
  const pleName = nextPle ? CONFIG.pleNames[ples.indexOf(nextPle)] : null;

  return (
    <View style={{ flex: 1, maxWidth: 1000, width: '100%', alignSelf: 'center', padding: 16, gap: 12 }}>
      <Card accent={info.color}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H color={info.color} size={22}>{info.name.toUpperCase()}</H>
          <T color={C.muted} bold>{t('season')} {st.season} · {t('week')} {st.week}/{st.settings.seasonWeeks}</T>
        </Row>
        <Row gap={18}>
          <T>{t('cash')}: <T bold color={C.gold}>{money(me.cash)}</T></T>
          <T>{t('fans')}: <T bold>{me.fans.toLocaleString()}</T></T>
          {pleName ? <T color={isPle ? C.gold : C.muted} bold={isPle}>{isPle ? `${t('thisWeekPle')}: ${pleName}` : `${t('nextPle')}: ${pleName} (${t('week')} ${nextPle})`}</T> : null}
        </Row>
        <Row>
          <Pill label={t('bookShow')} active={tab === 'book'} onPress={() => setTab('book')} color={info.color} />
          <Pill label={t('roster')} active={tab === 'roster'} onPress={() => setTab('roster')} color={info.color} />
          <Pill label={t('standings')} active={tab === 'standings'} onPress={() => setTab('standings')} color={info.color} />
          <Pill label={t('titles')} active={tab === 'titles'} onPress={() => setTab('titles')} color={info.color} />
        </Row>
      </Card>
      {tab === 'book' ? <Booking /> : tab === 'roster' ? <RosterView /> : tab === 'standings' ? <Standings /> : <Titles />}
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
    const bySlot = (slot: Slot) => plan.matches.filter((m) => m.slot === slot);
    const queue = { opener: bySlot('opener'), midcard: bySlot('midcard'), main: bySlot('main') };
    next.matches = next.matches.map((m) => {
      const pm = queue[m.slot].shift();
      return pm ? { slot: m.slot, a: pm.sides[0][0], b: pm.sides[1][0], stip: pm.stipulation, title: !!pm.titleId } : m;
    });
    next.promos = next.promos.map((p, i) => (plan.promos[i] ? { w: plan.promos[i].wrestlers[0], kind: plan.promos[i].kind } : p));
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
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      {slots.matches > (content.difficulty.find((d) => d.name === st.settings.difficulty)?.matches ?? 0) && !isPle ? <T color={C.gold}>{t('goHome')}</T> : null}
      <Card>
        <H size={15}>{t('venue')}</H>
        <Row>
          {content.venues.map((v) => (
            <Pill key={v.tier} active={card.venue === v.tier} color={info.color} onPress={() => setCard((c) => ({ ...c, venue: v.tier }))}
              label={`${lang === 'he' ? v.tierHe ?? v.tier : v.tier} · ${v.cost ? money(v.cost) : t('free')}`} />
          ))}
        </Row>
        <T color={C.muted} size={12}>{t('capacity')} {(venue.capacity + (isPle ? 5000 : 0)).toLocaleString()} · {t('ticket')} ${venue.ticket + (isPle ? 2 : 0)} · {t('quality')} +{venue.quality + (isPle ? 5 : 0)}%</T>
      </Card>

      {card.matches.map((m, i) => {
        const title = titleFor(m);
        return (
          <Card key={i} accent={m.slot === 'main' ? C.gold : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H size={14} color={m.slot === 'main' ? C.gold : C.muted}>{slotLabel(m.slot).toUpperCase()}</H>
              <Pressable onPress={() => setPicker({ kind: 'stip', i })}><T color={C.gold} size={13}>{t('stip')}: {stipLabel(m.stip)} ▾</T></Pressable>
            </Row>
            <Row gap={10}>
              <Slotbox w={W(m.a)} onPress={() => setPicker({ kind: 'match', i, side: 'a' })} onClear={() => setMatch(i, { a: null, title: false })} />
              <T color={C.muted} bold>{t('vs')}</T>
              <Slotbox w={W(m.b)} onPress={() => setPicker({ kind: 'match', i, side: 'b' })} onClear={() => setMatch(i, { b: null, title: false })} />
            </Row>
            {title ? <Pill label={`${t('forTitle')}: ${title.name}`} active={m.title} onPress={() => setMatch(i, { title: !m.title })} /> : null}
          </Card>
        );
      })}

      {card.promos.map((p, i) => (
        <Card key={`p${i}`}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H size={14} color={C.muted}>{t('promo').toUpperCase()} {i + 1}</H>
            <Row>
              <Pill label={t('selfPromo')} active={p.kind === 'Self-Promo'} onPress={() => setPromo(i, { kind: 'Self-Promo' })} />
              <Pill label={t('training')} active={p.kind === 'Training'} onPress={() => setPromo(i, { kind: 'Training' })} />
            </Row>
          </Row>
          <Slotbox w={W(p.w)} onPress={() => setPicker({ kind: 'promo', i })} onClear={() => setPromo(i, { w: null })} />
        </Card>
      ))}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>{t('estCost')}: <T bold color={C.gold}>{money(cost)}</T></T>
          <Row>
            <Btn kind="ghost" label={t('clear')} onPress={() => setCard(emptyCard())} />
            <Btn kind="ghost" label={t('autoBook')} onPress={autoBook} />
            <Btn label={t('runShow')} onPress={run} disabled={!ready} color={info.color} />
          </Row>
        </Row>
        {!ready ? <T color={C.muted} size={12}>{t('needMain')}</T> : null}
      </Card>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 16 }}>
          <Card style={{ maxHeight: '85%', maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H size={16}>{picker?.kind === 'stip' ? t('stip') : t('selectWrestler')}</H>
              <Btn kind="ghost" label={t('close')} onPress={() => setPicker(null)} />
            </Row>
            {picker?.kind === 'stip' ? (
              <ScrollView contentContainerStyle={{ gap: 6 }}>
                {singlesStips.map((s) => {
                  const open = isStipUnlocked(s, st.week, isPle);
                  return (
                    <Pressable key={s.name} disabled={!open} onPress={() => { setMatch(picker.i, { stip: s.name }); setPicker(null); }} style={{ opacity: open ? 1 : 0.35 }}>
                      <Card style={{ paddingVertical: 8 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T bold>{lang === 'he' ? s.nameHe ?? s.name : s.name}</T>
                          <T color={C.muted} size={12}>+{s.starBonus}★ · {money((s.costTier - 1) * CONFIG.economy.stipCostPerTier)} · {s.stamina}{open ? '' : ` · ${s.unlock}`}</T>
                        </Row>
                      </Card>
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
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Slotbox({ w, onPress, onClear }: { w: Wrestler | null; onPress: () => void; onClear: () => void }) {
  const { t, lang } = useStore();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minWidth: 140, padding: 10, borderRadius: 10, borderWidth: 1, borderStyle: w ? 'solid' : 'dashed', borderColor: C.line, backgroundColor: C.panel2 }}>
      {w ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T bold>{wName(w, lang)}</T>
            <T color={C.muted} size={11}>{wTags(w, lang)} · {t('stamina')} {Math.round(w.stamina)}</T>
          </View>
          <Pressable onPress={onClear} hitSlop={8}><T color={C.muted}>✕</T></Pressable>
        </Row>
      ) : (
        <T color={C.muted}>+ {t('selectWrestler')}</T>
      )}
    </Pressable>
  );
}

function WrestlerLine({ w }: { w: Wrestler }) {
  const { t, lang, game } = useStore();
  const me = game!.state.brands.find((b) => b.id === game!.playerId)!;
  const champ = me.titles.find((ti) => ti.holder === w.id);
  return (
    <Card style={{ paddingVertical: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flexBasis: 200, flexGrow: 1 }}>
          <T bold>{wName(w, lang)} {champ ? '🏆' : ''}{w.injuredWeeks > 0 ? ` · ${t('injured')} (${w.injuredWeeks})` : ''}</T>
          <T color={C.muted} size={11}>{wTags(w, lang)} · {t('pop')} {Math.round(w.popularity)} · {t('ring')} {Math.round(w.ringLevel)} · {t('record')} {w.wins}-{w.losses}</T>
        </View>
        <View style={{ width: 160, gap: 4 }}>
          <Row gap={6}><T color={C.muted} size={10}>{t('stamina')}</T><Bar value={w.stamina} max={w.maxStamina} /></Row>
          <Row gap={6}><T color={C.muted} size={10}>{t('morale')}</T><Bar value={w.morale} /></Row>
          <Mic value={w.mic} />
        </View>
      </Row>
    </Card>
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
    <ScrollView contentContainerStyle={{ gap: 8 }}>
      {rows.map((b, i) => {
        const info = brandInfo(b.id);
        const avg = b.showRatings.length ? b.showRatings.reduce((x, y) => x + y, 0) / b.showRatings.length : 0;
        return (
          <Card key={b.id} accent={info.color}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H color={info.color}>{i + 1}. {info.name.toUpperCase()}{b.id === game!.playerId ? ' ◀' : ''}</H>
              <T>{t('fans')}: <T bold>{b.fans.toLocaleString()}</T></T>
            </Row>
            <Row gap={16}>
              <T color={C.muted}>{t('cash')}: {money(b.cash)}</T>
              <T color={C.muted}>{t('avgRating')}: {avg.toFixed(2)}★</T>
              <T color={C.muted}>{t('roster')}: {b.roster.length}</T>
            </Row>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Titles() {
  const { t, lang, game } = useStore();
  const st = game!.state;
  return (
    <ScrollView contentContainerStyle={{ gap: 8 }}>
      {st.brands.map((b) => {
        const info = brandInfo(b.id);
        return (
          <Card key={b.id} accent={info.color}>
            <H color={info.color} size={16}>{info.name.toUpperCase()}</H>
            {b.titles.map((ti) => (
              <Row key={ti.id} style={{ justifyContent: 'space-between' }}>
                <T color={ti.kind === 'world' ? C.gold : C.text} bold={ti.kind === 'world'}>{ti.name}</T>
                <T>{ti.holder ? wName(st.wrestlers[ti.holder], lang) : t('vacant')} <T color={C.muted} size={11}>({ti.weeksHeld} {t('weeks')})</T></T>
              </Row>
            ))}
          </Card>
        );
      })}
    </ScrollView>
  );
}
