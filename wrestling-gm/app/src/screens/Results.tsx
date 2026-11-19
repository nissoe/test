// תוצאות השבוע: הכרטיס שלנו בפירוט, והתוכניות היריבות בקצרה.
import { ScrollView, View } from 'react-native';
import { endSeason, isSeasonOver } from '../../../engine/src/game.ts';
import { brandInfo } from '../data.ts';
import { money } from '../i18n.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Card, H, Row, Stars, T, wName } from '../ui.tsx';

export function Results() {
  const { t, lang, game, setPhase } = useStore();
  const g = game!;
  const st = g.state;
  const res = g.lastResults;
  const mine = res.find((r) => r.brand === g.playerId)!;
  const others = res.filter((r) => r.brand !== g.playerId).sort((a, b) => b.rating - a.rating);
  const info = brandInfo(g.playerId);
  const name = (id: string) => wName(st.wrestlers[id], lang);
  const order = { opener: 0, midcard: 1, main: 2 } as const;
  const matches = [...mine.matches].sort((a, b) => order[a.match.slot] - order[b.match.slot]);

  const next = () => {
    if (isSeasonOver(st)) {
      endSeason(st);
      setPhase('seasonEnd');
    } else setPhase('hub');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center', paddingBottom: 40 }}>
      <Card accent={mine.isPle ? C.gold : info.color}>
        <T color={C.muted} bold>{t('week')} {mine.week}{mine.pleName ? ` · ${mine.pleName}` : ''}</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <H color={info.color} size={22}>{info.name.toUpperCase()}</H>
          <View style={{ alignItems: 'flex-end' }}>
            <T color={C.muted} size={11}>{t('showRating')}</T>
            <Stars value={mine.rating} size={24} />
          </View>
        </Row>
        <Row gap={16}>
          <T>{t('attendance')}: <T bold>{mine.attendance.toLocaleString()}</T></T>
          <T>{t('revenue')}: <T bold color={C.good}>{money(mine.revenue)}</T></T>
          <T>{t('costs')}: <T bold color={C.bad}>{money(mine.costs)}</T></T>
          <T>{t('fansChange')}: <T bold color={mine.fansGained >= 0 ? C.good : C.bad}>{mine.fansGained >= 0 ? '+' : ''}{mine.fansGained.toLocaleString()}</T></T>
        </Row>
      </Card>

      {matches.map((m, i) => (
        <Card key={i} accent={m.match.slot === 'main' ? C.gold : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T color={C.muted} size={12} bold>{(m.match.slot === 'main' ? t('main') : m.match.slot === 'opener' ? t('opener') : t('midcard')).toUpperCase()} · {m.match.stipulation}</T>
            <Stars value={m.stars} />
          </Row>
          <T bold>{m.match.sides.map((s) => s.map(name).join(' & ')).join(` ${t('vs')} `)}</T>
          <T color={C.muted}>{name(m.winners[0])} {t('wins')} <T color={C.text} bold>{m.finisher}</T></T>
          {m.newChampion ? <T color={C.gold} bold>🏆 {t('newChampion')}: {name(m.newChampion)}</T> : null}
        </Card>
      ))}

      {mine.injuries.length ? (
        <Card>
          <T color={C.bad} bold>{t('injuries')}: {mine.injuries.map((id) => `${name(id)} (${st.wrestlers[id].injuredWeeks})`).join(', ')}</T>
        </Card>
      ) : null}

      <Card>
        <H size={15}>{t('rivals')}</H>
        {others.map((r) => {
          const b = brandInfo(r.brand);
          const main = r.matches.find((m) => m.match.slot === 'main');
          return (
            <Row key={r.brand} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T bold color={b.color}>{b.name.toUpperCase()}</T>
                {main ? <T color={C.muted} size={12}>{main.match.sides.map((s) => s.map(name).join(' & ')).join(` ${t('vs')} `)}</T> : null}
              </View>
              <Stars value={r.rating} />
            </Row>
          );
        })}
      </Card>

      <Btn label={t('continue')} onPress={next} color={info.color} />
    </ScrollView>
  );
}

export function SeasonEnd() {
  const { t, game, setPhase } = useStore();
  const st = game!.state;
  const rows = [...st.brands].sort((a, b) => b.fans - a.fans);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <H size={30} color={C.gold}>{t('seasonOver').toUpperCase()}</H>
      </View>
      {rows.map((b, i) => {
        const info = brandInfo(b.id);
        const avg = b.showRatings.reduce((x, y) => x + y, 0) / Math.max(1, b.showRatings.length);
        return (
          <Card key={b.id} accent={i === 0 ? C.gold : info.color}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H color={info.color}>{i === 0 ? '🏆 ' : ''}{i + 1}. {info.name.toUpperCase()}{b.id === game!.playerId ? ' ◀' : ''}</H>
              <T bold>{b.fans.toLocaleString()} {t('fans')}</T>
            </Row>
            <Row gap={16}>
              <T color={C.muted}>{t('avgRating')}: {avg.toFixed(2)}★</T>
              <T color={C.muted}>{t('cash')}: {money(b.cash)}</T>
              <T color={C.muted}>{t('trophy')}: {b.trophies}</T>
            </Row>
          </Card>
        );
      })}
      <Btn label={t('playAgain')} onPress={() => setPhase('setup')} />
    </ScrollView>
  );
}
