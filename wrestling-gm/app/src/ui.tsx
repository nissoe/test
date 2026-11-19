// שפת העיצוב: שידור טלוויזיוני. פלדה כהה, זהב מתכתי, צורות משופעות, תאורה וזוהר.
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Wrestler } from '../../engine/src/types.ts';
import type { Lang } from './i18n.ts';
import * as sfx from './sfx.ts';

export const C = {
  bg: '#06070B',
  bg2: '#0C0F17',
  panel: '#111521',
  panel2: '#181D2B',
  line: '#262C3D',
  steel: '#A7B0C2',
  text: '#F4F6FA',
  muted: '#7F889C',
  gold: '#E2B84B',
  goldHi: '#FFE9A3',
  goldLo: '#8E6516',
  good: '#3DDC84',
  bad: '#FF4D5A',
};

export const GOLD = ['#FFF1B8', '#E9BE4C', '#A87A1C', '#E2B84B'] as const;
export const STEEL = ['#2A3142', '#151A26', '#0C0F17'] as const;

/** פונטים לפי שפה: לאנגלית Anton ו-Barlow Condensed, לעברית Secular One ו-Rubik */
export function fonts(lang: Lang) {
  return lang === 'he'
    ? { display: 'SecularOne_400Regular', head: 'Rubik_800ExtraBold', headItalic: 'Rubik_800ExtraBold', body: 'Rubik_400Regular', bodyBold: 'Rubik_700Bold', num: 'BarlowCondensed_700Bold' }
    : { display: 'Anton_400Regular', head: 'BarlowCondensed_800ExtraBold', headItalic: 'BarlowCondensed_800ExtraBold_Italic', body: 'Rubik_400Regular', bodyBold: 'Rubik_700Bold', num: 'BarlowCondensed_700Bold' };
}

// השפה הנוכחית לרכיבים (מתעדכנת מהחנות)
let LANG: Lang = 'en';
export function setUiLang(l: Lang) { LANG = l; }
export const F = () => fonts(LANG);

/** כותרת תצוגה גדולה (שמות, מותגים) */
export function Display({ children, size = 32, color = C.text, glow, style, numberOfLines }: { children: ReactNode; size?: number; color?: string; glow?: string; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F().display, fontSize: size, color, letterSpacing: LANG === 'he' ? 0 : 1, lineHeight: size * 1.15 }, glow ? { textShadowColor: glow, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } } : null, style]}>
      {children}
    </Text>
  );
}

/** כותרת משנה דחוסה באותיות גדולות */
export function Head({ children, size = 16, color = C.text, italic, style, numberOfLines }: { children: ReactNode; size?: number; color?: string; italic?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const f = F();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: italic ? f.headItalic : f.head, fontSize: size, color, letterSpacing: LANG === 'he' ? 0 : 1.2, textTransform: LANG === 'he' ? 'none' : 'uppercase' }, style]}>{children}</Text>;
}

export function T({ children, color = C.text, size = 14, bold, style, numberOfLines }: { children: ReactNode; color?: string; size?: number; bold?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const f = F();
  return <Text numberOfLines={numberOfLines} style={[{ color, fontSize: size, fontFamily: bold ? f.bodyBold : f.body }, style]}>{children}</Text>;
}

/** מספר בפונט דחוס (סטטיסטיקות) */
export function Num({ children, size = 18, color = C.text }: { children: ReactNode; size?: number; color?: string }) {
  return <Text style={{ fontFamily: F().num, fontSize: size, color, fontVariant: ['tabular-nums'] }}>{children}</Text>;
}

export function Row({ children, style, gap = 8, wrap = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

/** כפתור: זהב מתכתי משופע, עם לחיצה מונפשת וצליל */
export function Btn({ label, onPress, kind = 'primary', disabled, color, style, small }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'brand'; disabled?: boolean; color?: string; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  const colors = kind === 'primary' ? GOLD : kind === 'brand' ? ([color ?? C.gold, shade(color ?? C.gold, -0.45)] as const) : (['transparent', 'transparent'] as const);
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => press(0.95)}
      onPressOut={() => press(1)}
      onPress={() => { sfx.click(); onPress(); }}
      style={[{ opacity: disabled ? 0.35 : 1 }, style]}
    >
      <Animated.View style={{ transform: [{ scale }, { skewX: '-10deg' }] }}>
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.btn, small && { paddingVertical: 8, paddingHorizontal: 14 }, kind === 'ghost' && { borderWidth: 1.5, borderColor: color ?? C.gold }]}
        >
          <View style={{ transform: [{ skewX: '10deg' }] }}>
            <Head size={small ? 13 : 16} color={kind === 'ghost' ? color ?? C.gold : kind === 'primary' ? '#1A1206' : '#fff'} italic>
              {label}
            </Head>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/** לוח: פאנל כהה עם מעבר פלדה ושוליים דקים */
export function Panel({ children, style, accent, pad = 14 }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string; pad?: number }) {
  return (
    <LinearGradient colors={['#151A27', '#0E121C']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[s.panel, { padding: pad }, style]}>
      {accent ? <LinearGradient colors={[accent, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentBar} /> : null}
      {children}
    </LinearGradient>
  );
}

/** תווית משופעת (כמו גרפיקה של שידור) */
export function Plate({ label, color = C.gold, text = '#0A0A0A', size = 13 }: { label: string; color?: string; text?: string; size?: number }) {
  return (
    <View style={{ transform: [{ skewX: '-12deg' }], backgroundColor: color, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <View style={{ transform: [{ skewX: '12deg' }] }}>
        <Head size={size} color={text}>{label}</Head>
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress, color = C.gold }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress ? () => { sfx.click(); onPress(); } : undefined} style={[s.chip, { borderColor: active ? color : C.line, backgroundColor: active ? color + '26' : '#0E121C' }]}>
      <Head size={13} color={active ? color : C.muted}>{label}</Head>
    </Pressable>
  );
}

/** כוכבים מונפשים: מתמלאים אחד אחד */
export function Stars({ value, size = 18, animate = false, onStar }: { value: number; size?: number; animate?: boolean; onStar?: (i: number) => void }) {
  const anims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(animate ? 0 : 1))).current;
  useEffect(() => {
    if (!animate) return;
    const n = Math.ceil(value);
    anims.forEach((a, i) => a.setValue(i < n ? 0 : 1));
    const timers = anims.slice(0, n).map((a, i) =>
      setTimeout(() => {
        onStar?.(i);
        Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
      }, i * 260),
    );
    return () => timers.forEach(clearTimeout);
  }, [value, animate]);
  return (
    <Row gap={2} wrap={false}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <Animated.View key={i} style={{ transform: [{ scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], opacity: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }}>
            <View style={{ width: size, height: size }}>
              <Text style={{ position: 'absolute', fontSize: size, lineHeight: size, color: '#2B3142' }}>★</Text>
              <View style={{ position: 'absolute', width: size * fill, height: size, overflow: 'hidden' }}>
                <Text style={{ fontSize: size, lineHeight: size, color: C.gold, textShadowColor: C.gold, textShadowRadius: 8 }}>★</Text>
              </View>
            </View>
          </Animated.View>
        );
      })}
    </Row>
  );
}

export function Bar({ value, max = 100, color = C.good, height = 5 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const c = pct < 0.4 ? C.bad : pct < 0.6 ? C.gold : color;
  return (
    <View style={{ height, backgroundColor: '#1F2534', borderRadius: height, overflow: 'hidden', flex: 1, minWidth: 40 }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: c, borderRadius: height }} />
    </View>
  );
}

export function Mic({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <Row gap={2} wrap={false}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: size, height: size * 0.55, transform: [{ skewX: '-15deg' }], backgroundColor: i < value ? C.gold : '#262C3D' }} />
      ))}
    </Row>
  );
}

const CLASS_ICON: Record<string, string> = { Giant: '▲', Cruiser: '✦', Bruiser: '■', Fighter: '◆', Specialist: '✪' };

/** דיוקן זמני: מונוגרמה על מעבר בצבע המותג. יוחלף בדיוקנאות המאוירים */
export function Portrait({ w, size = 56, color = '#3A4256' }: { w: Wrestler; size?: number; color?: string }) {
  const initials = w.name.split(' ').filter((x) => /^[A-Z]/.test(x)).slice(0, 2).map((x) => x[0]).join('');
  return (
    <LinearGradient colors={[color, shade(color, -0.7)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size * 1.15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff22' }}>
      <View style={{ position: 'absolute', width: size * 2, height: size * 0.35, backgroundColor: '#ffffff10', transform: [{ rotate: '-35deg' }], top: size * 0.15 }} />
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: size * 0.48, color: '#fff', textShadowColor: '#0008', textShadowRadius: 6 }}>{initials}</Text>
      <Text style={{ position: 'absolute', bottom: 3, right: 5, fontSize: size * 0.2, color: '#ffffffcc' }}>{CLASS_ICON[w.class] ?? ''}</Text>
    </LinearGradient>
  );
}

/** כניסה מונפשת: החלקה ודהייה */
export function FadeIn({ children, delay = 0, from = 18, style }: { children: ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>{children}</Animated.View>;
}

export const wName = (w: Wrestler, lang: Lang) => (lang === 'he' ? w.nameHe : w.name);
export const wTags = (w: Wrestler, lang: Lang) => (lang === 'he' ? `${w.classHe ?? w.class} · ${w.roleHe ?? w.role}` : `${w.class} · ${w.role}`);

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: 4, borderWidth: 1, borderColor: C.line, gap: 10, overflow: 'hidden' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderRadius: 3 },
});
