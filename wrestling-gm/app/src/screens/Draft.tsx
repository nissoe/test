// דראפט צעד-אחר-צעד: השחקן בוחר בתורו, המחשב בוחר בשאר התורות.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { aiPick, applyPick, draftPool, draftValue } from '../../../engine/src/draft.ts';
import { setupTitles } from '../../../engine/src/game.ts';
import type { Wrestler } from '../../../engine/src/types.ts';
import { brandInfo } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Card, H, Mic, Pill, Row, T, wName, wTags } from '../ui.tsx';

export function Draft() {
  const { t, lang, game, refresh, setPhase } = useStore();
  const [filter, setFilter] = useState<'all' | 'M' | 'F'>('all');
  const g = game!;
  const st = g.state;
  const target = st.settings.rosterTarget;
  const me = st.brands.find((b) => b.id === g.playerId)!;

  /** מריץ את בחירות המחשב עד התור של השחקן, ומסיים כשהדראפט נגמר */
  const advance = (forPlayerToo = false) => {
    while (g.draftIdx < g.draftSeq.length) {
      const brand = st.brands.find((b) => b.id === g.draftSeq[g.draftIdx])!;
      if (brand.roster.length >= target) { g.draftIdx++; continue; }
      if (brand.id === g.playerId && !forPlayerToo) break;
      const w = aiPick(brand, draftPool(st), st, target - brand.roster.length);
      if (w) applyPick(st, brand.id, w.id);
      g.draftIdx++;
    }
    if (g.draftIdx >= g.draftSeq.length) {
      setupTitles(st);
      setPhase('hub');
    }
    refresh();
  };

  useEffect(() => { advance(); }, []);

  const pickMine = (w: Wrestler) => {
    applyPick(st, g.playerId, w.id);
    g.draftIdx++;
    advance();
  };

  const pool = useMemo(
    () => draftPool(st).filter((w) => filter === 'all' || w.gender === filter).sort((a, b) => draftValue(b) - draftValue(a)),
    [filter, g.draftIdx, st],
  );
  const slotsLeft = target - me.roster.length;
  const reserve = Math.max(0, slotsLeft - 1) * 40000;
  const info = brandInfo(me.id);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, maxWidth: 1000, width: '100%', alignSelf: 'center' }}>
      <Card accent={info.color}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H color={info.color}>{t('draft')} · {info.name.toUpperCase()}</H>
          <T color={C.muted}>{t('pick')} {Math.min(g.draftIdx + 1, g.draftSeq.length)} {t('of')} {g.draftSeq.length}</T>
        </Row>
        <Row gap={16}>
          <T>{t('budget')}: <T bold color={C.gold}>{money(me.cash)}</T></T>
          <T>{t('roster')}: <T bold>{me.roster.length}/{target}</T></T>
        </Row>
        <Row>
          <Pill label={t('all')} active={filter === 'all'} onPress={() => setFilter('all')} />
          <Pill label={t('men')} active={filter === 'M'} onPress={() => setFilter('M')} />
          <Pill label={t('women')} active={filter === 'F'} onPress={() => setFilter('F')} />
          <View style={{ flex: 1 }} />
          <Btn kind="ghost" label={t('autoPick')} onPress={() => { const w = aiPick(me, draftPool(st), st, slotsLeft); if (w) pickMine(w); }} />
          <Btn kind="ghost" label={t('autoDraft')} onPress={() => advance(true)} />
        </Row>
      </Card>

      <FlatList
        data={pool}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ gap: 6 }}
        renderItem={({ item: w }) => {
          const can = w.salary <= me.cash - reserve;
          return (
            <Pressable onPress={can ? () => pickMine(w) : undefined} style={({ pressed }) => ({ opacity: can ? (pressed ? 0.7 : 1) : 0.35 })}>
              <Card style={{ paddingVertical: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flexBasis: 220, flexGrow: 1 }}>
                    <T bold>{wName(w, lang)}</T>
                    <T color={C.muted} size={12}>{wTags(w, lang)} · {w.gender === 'F' ? t('women') : t('men')}{w.tagTeam ? ` · ${w.tagTeam}` : ''}</T>
                  </View>
                  <Row gap={14}>
                    <Stat k={t('pop')} v={w.popularity} />
                    <Stat k={t('ring')} v={w.ringLevel} />
                    <View style={{ alignItems: 'center' }}><T color={C.muted} size={10}>{t('mic')}</T><Mic value={w.mic} /></View>
                    <View style={{ alignItems: 'flex-end', minWidth: 70 }}><T color={C.muted} size={10}>{t('salary')}</T><T bold color={C.gold}>{money(w.salary)}</T></View>
                  </Row>
                </Row>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 36 }}>
      <T color={C.muted} size={10}>{k}</T>
      <T bold>{Math.round(v)}</T>
    </View>
  );
}
