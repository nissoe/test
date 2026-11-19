// דראפט חי: כל בחירה של היריבים נחשפת על המסך, עם מיון, סינון, חיפוש ולוח דראפט מלא.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { aiPick, applyPick, draftPool, draftValue } from '../../../engine/src/draft.ts';
import { setupTitles } from '../../../engine/src/game.ts';
import type { ClassName, Wrestler } from '../../../engine/src/types.ts';
import { brandInfo } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Chip, Display, F, FadeIn, GLASS, Head, Mic, Num, Panel, Plate, Portrait, Row, Stage, T, shade, wName, wTags } from '../ui.tsx';
import { arena } from '../arena/arena.ts';
import * as sfx from '../sfx.ts';

type SortKey = 'value' | 'name' | 'popularity' | 'ringLevel' | 'mic' | 'salary';
const CLASSES: ClassName[] = ['Giant', 'Cruiser', 'Bruiser', 'Fighter', 'Specialist'];
const CLASS_HE: Record<ClassName, string> = { Giant: 'ענק', Cruiser: 'קל-משקל', Bruiser: 'מכתש', Fighter: 'לוחם', Specialist: 'מומחה' };

export function Draft() {
  const { t, lang, game, refresh, setPhase } = useStore();
  const g = game!;
  const st = g.state;
  const target = st.settings.rosterTarget;
  const me = st.brands.find((b) => b.id === g.playerId)!;
  const [tab, setTab] = useState<'pool' | 'board'>('pool');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'value', desc: true });
  const [gender, setGender] = useState<'all' | 'M' | 'F'>('all');
  const [cls, setCls] = useState<ClassName | 'all'>('all');
  const [role, setRole] = useState<'all' | 'Face' | 'Heel'>('all');
  const [query, setQuery] = useState('');
  const narrow = useWindowDimensions().width < 900;
  const [showFilters, setShowFilters] = useState(!narrow);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // דילוג על מותגים שהרוסטר שלהם מלא
  const skipFull = () => {
    while (g.draftIdx < g.draftSeq.length) {
      const b = st.brands.find((x) => x.id === g.draftSeq[g.draftIdx])!;
      if (b.roster.length < target) break;
      g.draftIdx++;
    }
  };
  const current = () => { skipFull(); return g.draftIdx < g.draftSeq.length ? st.brands.find((b) => b.id === g.draftSeq[g.draftIdx])! : null; };

  const doPick = (brandId: string, w: Wrestler) => {
    applyPick(st, brandId, w.id);
    g.draftFeed.unshift({ brand: brandId, wrestler: w.id, no: g.draftIdx + 1 });
    g.draftIdx++;
  };

  const aiStep = (silent = false) => {
    const b = current();
    if (!b) return;
    const w = aiPick(b, draftPool(st), st, target - b.roster.length);
    if (w) doPick(b.id, w);
    else g.draftIdx++;
    if (!silent) sfx.pick(w ? w.popularity >= 55 : false);
  };

  const finish = () => {
    setupTitles(st);
    sfx.fanfare();
    sfx.crowd(0.8, 3);
    setPhase('hub');
  };

  // היריבים בוחרים אחד אחרי השני, עם השהיה כדי שאפשר יהיה לראות כל בחירה
  const b = current();
  useEffect(() => {
    if (!b) { finish(); return; }
    if (b.id === g.playerId) return;
    timer.current = setTimeout(() => { aiStep(); refresh(); }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [g.draftIdx, b?.id]);

  const skipToMe = () => {
    if (timer.current) clearTimeout(timer.current);
    let c = current();
    while (c && c.id !== g.playerId) { aiStep(true); c = current(); }
    sfx.whoosh();
    refresh();
  };
  const autoRest = () => {
    if (timer.current) clearTimeout(timer.current);
    let c = current();
    while (c) {
      if (c.id === g.playerId) {
        const w = aiPick(c, draftPool(st), st, target - c.roster.length);
        if (w) doPick(c.id, w); else g.draftIdx++;
      } else aiStep(true);
      c = current();
    }
    refresh();
  };

  const myTurn = b?.id === g.playerId;

  // המסך הענק בזירה מציג את מי שבוחר ואת הבחירה האחרונה
  useEffect(() => { arena.shot('stage'); arena.hype(0.45); }, []);
  useEffect(() => {
    const lf = g.draftFeed[0];
    if (myTurn && b) {
      const bi = brandInfo(b.id);
      arena.screen({ kicker: `${t('round')} ${Math.floor(g.draftIdx / st.brands.length) + 1} · ${t('pick')} ${g.draftIdx + 1}`, title: bi.name.toUpperCase(), subtitle: 'On the clock', color: bi.color });
    } else if (lf) {
      const bi = brandInfo(lf.brand);
      const w = st.wrestlers[lf.wrestler];
      arena.screen({ kicker: `#${lf.no} · ${bi.name} ${t('selects')}`, title: w.name.toUpperCase(), subtitle: `${w.class} · POP ${w.popularity}`, color: bi.color });
      if (w.popularity >= 55) arena.pop(0.5);
    }
  }, [g.draftIdx, myTurn]);
  const slotsLeft = target - me.roster.length;
  const reserve = Math.max(0, slotsLeft - 1) * 40000;
  const nBrands = st.brands.length;
  const round = Math.floor(g.draftIdx / nBrands) + 1;

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = draftPool(st).filter((w) =>
      (gender === 'all' || w.gender === gender) && (cls === 'all' || w.class === cls) && (role === 'all' || w.role === role) &&
      (!q || w.name.toLowerCase().includes(q) || w.nameHe.includes(q)));
    const val = (w: Wrestler): number | string => sort.key === 'value' ? draftValue(w) : sort.key === 'name' ? wName(w, lang) : w[sort.key];
    list.sort((a, b2) => {
      const x = val(a), y = val(b2);
      const r = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
      return sort.desc ? -r : r;
    });
    return list;
  }, [g.draftIdx, sort, gender, cls, role, query, lang]);

  const sortChip = (key: SortKey, label: string) => (
    <Chip key={key} label={`${label}${sort.key === key ? (sort.desc ? ' ▼' : ' ▲') : ''}`} active={sort.key === key}
      onPress={() => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'name' }))} />
  );

  const last = g.draftFeed[0];
  const lastW = last ? st.wrestlers[last.wrestler] : null;
  const lastB = last ? brandInfo(last.brand) : null;
  const cur = b ? brandInfo(b.id) : null;
  const mine = brandInfo(me.id);

  return (
    <Stage arenaShare={0.26} width={640}>
    <View style={{ flex: 1, gap: 8 }}>
      {/* פס עליון: מי בוחר עכשיו */}
      <LinearGradient colors={[shade(cur?.color ?? C.gold, -0.35) + 'e6', '#0B0E16e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ ...GLASS, borderRadius: 4, padding: 12, borderWidth: 1, borderColor: (cur?.color ?? C.gold) + '88' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <Head size={12} color="#ffffffaa">{t('onTheClock')} · {t('round')} {Math.min(round, target)} · {t('pick')} {Math.min(g.draftIdx + 1, g.draftSeq.length)}/{g.draftSeq.length}</Head>
            <Display size={30} color="#fff" glow={cur?.color} style={{ fontStyle: 'italic' }}>{cur ? cur.name.toUpperCase() : ''}{myTurn ? ` · ${t('yourTurn')}` : ''}</Display>
          </View>
          <Row gap={14}>
            <View><Head size={11} color="#ffffff99">{t('budget')}</Head><Num size={22} color={C.gold}>{money(me.cash)}</Num></View>
            <View><Head size={11} color="#ffffff99">{t('roster')}</Head><Num size={22}>{me.roster.length}/{target}</Num></View>
          </Row>
        </Row>
        <Row style={{ marginTop: 8 }}>
          {!myTurn ? <Btn small kind="ghost" color="#fff" label={t('skip')} onPress={skipToMe} /> : null}
          <Btn small kind="ghost" color="#fff" label={t('autoPick')} disabled={!myTurn} onPress={() => { const w = aiPick(me, draftPool(st), st, slotsLeft); if (w) { doPick(me.id, w); sfx.pick(true); refresh(); } }} />
          <Btn small kind="ghost" color="#fff" label={t('autoDraft')} onPress={autoRest} />
        </Row>
      </LinearGradient>

      {/* הבחירה האחרונה, בגדול */}
      {lastW && lastB ? (
        <FadeIn key={last!.no} from={-14}>
          <LinearGradient colors={[shade(lastB.color, -0.55), '#0B0E16']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 4, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: lastB.color }}>
            <Portrait w={lastW} size={46} color={lastB.color} />
            <View style={{ flex: 1 }}>
              <Head size={12} color={lastB.color}>#{last!.no} · {lastB.name} {t('selects')}</Head>
              <Display size={22} numberOfLines={1}>{wName(lastW, lang)}</Display>
              <T size={12} color={C.muted}>{wTags(lastW, lang)} · {t('pop')} {lastW.popularity} · {money(lastW.salary)}</T>
            </View>
          </LinearGradient>
        </FadeIn>
      ) : null}

      <Row>
        <Chip label={t('available')} active={tab === 'pool'} onPress={() => setTab('pool')} color={mine.color} />
        <Chip label={t('board')} active={tab === 'board'} onPress={() => setTab('board')} color={mine.color} />
      </Row>

      {tab === 'pool' ? (
        <>
          <Panel pad={10} style={{ gap: 8 }}>
            <TextInput value={query} onChangeText={setQuery} placeholder={t('search')} placeholderTextColor={C.muted}
              style={{ fontFamily: F().body, color: C.text, backgroundColor: '#0A0D14', borderWidth: 1, borderColor: C.line, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlign: lang === 'he' ? 'right' : 'left' }} />
            {showFilters ? <Row gap={6}>
              <Head size={12} color={C.muted}>{t('sortBy')}</Head>
              {sortChip('value', t('value'))}{sortChip('name', t('name'))}{sortChip('popularity', t('pop'))}{sortChip('ringLevel', t('ring'))}{sortChip('mic', t('mic'))}{sortChip('salary', t('salary'))}
            </Row> : null}
            {narrow ? <Chip label={`${t('sortBy')} / ${lang === 'he' ? 'סינון' : 'Filter'} ${showFilters ? '▲' : '▼'}`} active={showFilters} onPress={() => setShowFilters(!showFilters)} /> : null}
            {showFilters ? <>
            <Row gap={6}>
              <Chip label={t('all')} active={gender === 'all'} onPress={() => setGender('all')} />
              <Chip label={t('men')} active={gender === 'M'} onPress={() => setGender('M')} />
              <Chip label={t('women')} active={gender === 'F'} onPress={() => setGender('F')} />
              <View style={{ width: 8 }} />
              <Chip label={t('face')} active={role === 'Face'} onPress={() => setRole(role === 'Face' ? 'all' : 'Face')} />
              <Chip label={t('heel')} active={role === 'Heel'} onPress={() => setRole(role === 'Heel' ? 'all' : 'Heel')} />
            </Row>
            <Row gap={6}>
              <Chip label={t('all')} active={cls === 'all'} onPress={() => setCls('all')} />
              {CLASSES.map((c) => <Chip key={c} label={lang === 'he' ? CLASS_HE[c] : c} active={cls === c} onPress={() => setCls(c)} />)}
            </Row>
            </> : null}
          </Panel>
          <FlatList
            data={pool}
            keyExtractor={(w) => w.id}
            contentContainerStyle={{ gap: 6, paddingBottom: 30 }}
            renderItem={({ item: w }) => {
              const can = myTurn && w.salary <= me.cash - reserve;
              return (
                <Pressable onPress={can ? () => { doPick(me.id, w); sfx.pick(true); sfx.crowd(Math.min(1, w.popularity / 70), 1.6); refresh(); } : undefined}
                  style={({ pressed }) => ({ opacity: w.salary > me.cash - reserve ? 0.35 : pressed ? 0.7 : 1 })}>
                  <LinearGradient colors={['#141927e6', '#0D1019e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ ...GLASS, borderRadius: 4, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: can ? mine.color + '55' : C.line }}>
                    <Portrait w={w} size={42} color={w.gender === 'F' ? '#7A3F8F' : '#3A4C72'} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Head size={17} numberOfLines={1} style={{ textTransform: 'none' }}>{wName(w, lang)}</Head>
                      <T size={11} color={C.muted} numberOfLines={1}>{wTags(w, lang)}{w.tagTeam ? ` · ${w.tagTeam}` : ''}</T>
                    </View>
                    <Stat k={t('pop')} v={w.popularity} />
                    <Stat k={t('ring')} v={w.ringLevel} />
                    <View style={{ alignItems: 'center', gap: 3 }}><Head size={9} color={C.muted}>{t('mic')}</Head><Mic value={w.mic} size={8} /></View>
                    <View style={{ alignItems: 'flex-end', minWidth: 54 }}><Head size={9} color={C.muted}>{t('salary')}</Head><Num size={16} color={C.gold}>{money(w.salary)}</Num></View>
                  </LinearGradient>
                </Pressable>
              );
            }}
          />
        </>
      ) : (
        <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 30 }}>
          {st.brands.map((br) => {
            const info = brandInfo(br.id);
            const picks = g.draftFeed.filter((f) => f.brand === br.id).reverse();
            return (
              <Panel key={br.id} accent={info.color} pad={10} style={{ width: 230 }}>
                <Display size={22} color={info.color} style={{ fontStyle: 'italic' }}>{info.name.toUpperCase()}</Display>
                <T size={12} color={C.muted}>{money(br.cash)} · {br.roster.length}/{target}</T>
                <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 4 }}>
                  {picks.map((p) => {
                    const w = st.wrestlers[p.wrestler];
                    return (
                      <Row key={p.no} gap={6} wrap={false}>
                        <Num size={13} color={C.muted}>{p.no}</Num>
                        <T size={13} numberOfLines={1} style={{ flex: 1 }}>{wName(w, lang)}</T>
                        <Num size={13} color={C.gold}>{w.popularity}</Num>
                      </Row>
                    );
                  })}
                </ScrollView>
              </Panel>
            );
          })}
        </ScrollView>
      )}
    </View>
    </Stage>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 30 }}>
      <Head size={9} color={C.muted}>{k}</Head>
      <Num size={18}>{Math.round(v)}</Num>
    </View>
  );
}
