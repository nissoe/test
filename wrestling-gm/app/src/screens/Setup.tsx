// מסך פתיחה: בחירת מותג, מספר יריבים, רמת קושי ואורך עונה.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BRANDS, content } from '../data.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Card, H, Pill, Row, T } from '../ui.tsx';

export function Setup() {
  const { t, lang, start } = useStore();
  const [brandId, setBrand] = useState('rage');
  const [rivals, setRivals] = useState(3);
  const [difficulty, setDifficulty] = useState('Normal');
  const [weeks, setWeeks] = useState<50 | 25>(50);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
        <Text style={{ color: C.gold, fontSize: 48, fontWeight: '900', fontStyle: 'italic', letterSpacing: 4 }}>LWF</Text>
        <T color={C.muted} bold>{t('league').toUpperCase()}</T>
        <H size={22}>GM</H>
      </View>

      <Card>
        <H>{t('chooseBrand')}</H>
        <Row gap={10}>
          {BRANDS.map((b) => {
            const active = b.id === brandId;
            return (
              <Pressable
                key={b.id}
                onPress={() => setBrand(b.id)}
                style={{ flexGrow: 1, flexBasis: 150, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: active ? b.color : C.line, backgroundColor: active ? b.color + '22' : C.panel2, gap: 4 }}
              >
                <Text style={{ color: b.color, fontSize: 20, fontWeight: '900', fontStyle: 'italic' }}>{b.name.toUpperCase()}</Text>
                <T color={C.muted} size={12}>{lang === 'he' ? b.taglineHe : b.tagline}</T>
              </Pressable>
            );
          })}
        </Row>
      </Card>

      <Card>
        <H size={16}>{t('opponents')}</H>
        <Row>{[1, 2, 3].map((n) => <Pill key={n} label={String(n)} active={rivals === n} onPress={() => setRivals(n)} />)}</Row>
        <H size={16}>{t('difficulty')}</H>
        <Row>
          {content.difficulty.map((d) => (
            <Pill key={d.name} label={`${lang === 'he' ? d.nameHe ?? d.name : d.name} · ${d.matches}/${d.promos}`} active={difficulty === d.name} onPress={() => setDifficulty(d.name)} />
          ))}
        </Row>
        <H size={16}>{t('seasonLength')}</H>
        <Row>{([50, 25] as const).map((w) => <Pill key={w} label={`${w} ${t('weeks')}`} active={weeks === w} onPress={() => setWeeks(w)} />)}</Row>
      </Card>

      <Btn label={t('start')} onPress={() => start({ brandId, rivals, difficulty, seasonWeeks: weeks })} />
    </ScrollView>
  );
}
