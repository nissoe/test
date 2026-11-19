// מסך פתיחה: לוגו גדול, בחירת מותג בכרטיסים מוארים, הגדרות משחק.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRANDS, content } from '../data.ts';
import { useStore } from '../store.tsx';
import { Btn, C, Chip, Display, FadeIn, Head, Panel, Row, T, shade } from '../ui.tsx';
import * as sfx from '../sfx.ts';

export function Setup() {
  const { t, lang, start } = useStore();
  const [brandId, setBrand] = useState('rage');
  const [rivals, setRivals] = useState(3);
  const [difficulty, setDifficulty] = useState('Normal');
  const [weeks, setWeeks] = useState<50 | 25>(50);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 18, maxWidth: 960, width: '100%', alignSelf: 'center', paddingBottom: 48 }}>
      <FadeIn style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 6 }}>
        <Animated.Text
          style={{
            fontFamily: 'Anton_400Regular', fontSize: 92, lineHeight: 100, color: C.gold, fontStyle: 'italic', letterSpacing: 6,
            textShadowColor: glow.interpolate({ inputRange: [0, 1], outputRange: ['#E2B84B33', '#FFE9A3cc'] }) as any,
            textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 },
          }}
        >
          LWF
        </Animated.Text>
        <Head size={15} color={C.steel} style={{ letterSpacing: 6 }}>Legends Wrestling Federation</Head>
        <View style={{ height: 2, width: 180, marginTop: 10 }}>
          <LinearGradient colors={['transparent', C.gold, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </View>
        <Head size={20} italic style={{ marginTop: 8, letterSpacing: 8 }}>General Manager</Head>
      </FadeIn>

      <FadeIn delay={150}>
        <Head size={14} color={C.muted} style={{ marginBottom: 10 }}>{t('chooseBrand')}</Head>
        <Row gap={10}>
          {BRANDS.map((b, i) => {
            const active = b.id === brandId;
            return (
              <Pressable key={b.id} onPress={() => { sfx.pick(); setBrand(b.id); }} style={{ flexGrow: 1, flexBasis: 160 }}>
                <LinearGradient
                  colors={active ? [shade(b.color, -0.1), shade(b.color, -0.75), '#07080C'] : ['#171C29', '#0D1018']}
                  start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
                  style={{ height: 120, borderRadius: 4, borderWidth: active ? 2 : 1, borderColor: active ? b.color : C.line, padding: 14, justifyContent: 'flex-end', overflow: 'hidden' }}
                >
                  <Text style={{ position: 'absolute', top: -10, right: -4, fontFamily: 'Anton_400Regular', fontSize: 90, color: active ? '#ffffff14' : '#ffffff06', fontStyle: 'italic' }}>{b.name[0]}</Text>
                  <Display size={28} color={active ? '#fff' : b.color} glow={active ? b.color : undefined} style={{ fontStyle: 'italic' }}>{b.name.toUpperCase()}</Display>
                  <T size={12} color={active ? '#ffffffcc' : C.muted}>{lang === 'he' ? b.taglineHe : b.tagline}</T>
                </LinearGradient>
              </Pressable>
            );
          })}
        </Row>
      </FadeIn>

      <FadeIn delay={300}>
        <Panel>
          <Head size={14} color={C.muted}>{t('opponents')}</Head>
          <Row>{[1, 2, 3].map((n) => <Chip key={n} label={String(n)} active={rivals === n} onPress={() => setRivals(n)} />)}</Row>
          <Head size={14} color={C.muted}>{t('difficulty')}</Head>
          <Row>
            {content.difficulty.map((d) => (
              <Chip key={d.name} label={`${lang === 'he' ? d.nameHe ?? d.name : d.name} · ${d.matches}/${d.promos}`} active={difficulty === d.name} onPress={() => setDifficulty(d.name)} />
            ))}
          </Row>
          <Head size={14} color={C.muted}>{t('seasonLength')}</Head>
          <Row>{([50, 25] as const).map((w) => <Chip key={w} label={`${w} ${t('weeks')}`} active={weeks === w} onPress={() => setWeeks(w)} />)}</Row>
        </Panel>
      </FadeIn>

      <FadeIn delay={420}>
        <Btn label={t('start')} onPress={() => { sfx.fanfare(); start({ brandId, rivals, difficulty, seasonWeeks: weeks }); }} />
      </FadeIn>
    </ScrollView>
  );
}
