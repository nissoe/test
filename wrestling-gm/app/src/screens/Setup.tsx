// מסך פתיחה: לוגו גדול, בחירת מותג בכרטיסים מוארים, הגדרות משחק.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRANDS, content } from '../data.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Chip, Display, FadeIn, Head, Panel, Row, Stage, T, shade } from '../ui.tsx';
import { arena } from '../arena/arena.ts';
import * as sfx from '../sfx.ts';

export function Setup() {
  const { t, lang, start } = useStore();
  const [brandId, setBrand] = useState('rage');
  const [rivals, setRivals] = useState(3);
  const [difficulty, setDifficulty] = useState('Normal');
  const [weeks, setWeeks] = useState<50 | 25>(50);

  useEffect(() => {
    const b = BRANDS.find((x) => x.id === brandId)!;
    arena.brand(b.color, b.name);
    arena.shot('wide');
    arena.hype(0.35);
    arena.screen({ kicker: 'Legends Wrestling Federation', title: b.name.toUpperCase(), subtitle: lang === 'he' ? b.tagline : b.tagline, color: b.color });
  }, [brandId, lang]);

  return (
    <Stage arenaShare={0.3}>
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <FadeIn>
        <Panel pad={12}>
          <Head size={13} color={C.gold}>{t('newGame')}</Head>
          <Head size={14} color={C.muted}>{t('chooseBrand')}</Head>
          <Row gap={8}>
            {BRANDS.map((b) => {
              const active = b.id === brandId;
              return (
                <Pressable key={b.id} onPress={() => { sfx.pick(); arena.pop(0.5); setBrand(b.id); }} style={{ flexGrow: 1, flexBasis: 150 }}>
                  <LinearGradient
                    colors={active ? [shade(b.color, -0.1), shade(b.color, -0.75)] : ['#171C29cc', '#0D1018cc']}
                    start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
                    style={{ height: 64, borderRadius: 3, borderWidth: active ? 2 : 1, borderColor: active ? b.color : C.line, padding: 10, justifyContent: 'flex-end', overflow: 'hidden', transform: [{ skewX: '-6deg' }] }}
                  >
                    <Display size={21} color={active ? '#fff' : b.color} style={{ fontStyle: 'italic' }}>{b.name.toUpperCase()}</Display>
                    <T size={11} color={active ? '#ffffffcc' : C.muted} numberOfLines={1}>{lang === 'he' ? b.taglineHe : b.tagline}</T>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </Row>
          <Head size={13} color={C.muted}>{t('opponents')}</Head>
          <Row>{[1, 2, 3].map((n) => <Chip key={n} label={String(n)} active={rivals === n} onPress={() => setRivals(n)} />)}</Row>
          <Head size={13} color={C.muted}>{t('difficulty')}</Head>
          <Row gap={6}>
            {content.difficulty.map((d) => (
              <Chip key={d.name} label={`${lang === 'he' ? d.nameHe ?? d.name : d.name} · ${d.matches}/${d.promos}`} active={difficulty === d.name} onPress={() => setDifficulty(d.name)} />
            ))}
          </Row>
          <Head size={13} color={C.muted}>{t('seasonLength')}</Head>
          <Row>{([50, 25] as const).map((w) => <Chip key={w} label={`${w} ${t('weeks')}`} active={weeks === w} onPress={() => setWeeks(w)} />)}</Row>
        </Panel>
      </FadeIn>
      <FadeIn delay={200}>
        <Btn label={t('start')} onPress={() => { sfx.fanfare(); arena.pyro(); start({ brandId, rivals, difficulty, seasonWeeks: weeks }); }} />
      </FadeIn>
    </ScrollView>
    </Stage>
  );
}
