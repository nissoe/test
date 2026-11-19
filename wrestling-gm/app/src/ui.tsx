// רכיבי ממשק משותפים בסגנון שידור: כהה, זהב ותאורה.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Wrestler } from '../../engine/src/types.ts';
import type { Lang } from './i18n.ts';

export const C = {
  bg: '#0A0C11',
  panel: '#141821',
  panel2: '#1C2230',
  line: '#2A3142',
  text: '#F2F4F8',
  muted: '#8B94A7',
  gold: '#D9B44A',
  good: '#3CCB7F',
  bad: '#E5484D',
};

export function Btn({ label, onPress, kind = 'primary', disabled, color, style }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean; color?: string; style?: StyleProp<ViewStyle> }) {
  const bg = kind === 'primary' ? color ?? C.gold : 'transparent';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: color ?? C.gold, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={[s.btnText, { color: kind === 'primary' ? '#0A0C11' : color ?? C.gold }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return <View style={[s.card, accent ? { borderTopColor: accent, borderTopWidth: 3 } : null, style]}>{children}</View>;
}

export function H({ children, size = 18, color = C.text }: { children: ReactNode; size?: number; color?: string }) {
  return <Text style={{ color, fontSize: size, fontWeight: '800', letterSpacing: 0.5 }}>{children}</Text>;
}

export function T({ children, color = C.text, size = 14, bold }: { children: ReactNode; color?: string; size?: number; bold?: boolean }) {
  return <Text style={{ color, fontSize: size, fontWeight: bold ? '700' : '400' }}>{children}</Text>;
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Pill({ label, active, onPress, color = C.gold }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, { borderColor: active ? color : C.line, backgroundColor: active ? color + '22' : 'transparent' }]}>
      <Text style={{ color: active ? color : C.muted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** כוכבים: מלאים, חצי, ועוד המספר */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <Text style={{ color: C.gold, fontSize: size, fontWeight: '800' }}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      <Text style={{ color: C.muted, fontSize: size - 3 }}> {value.toFixed(2)}</Text>
    </Text>
  );
}

export function Bar({ value, max = 100, color = C.good }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const c = pct < 0.4 ? C.bad : pct < 0.6 ? C.gold : color;
  return (
    <View style={s.barBg}>
      <View style={[s.barFg, { width: `${pct * 100}%`, backgroundColor: c }]} />
    </View>
  );
}

export const wTags = (w: Wrestler, lang: Lang) => (lang === 'he' ? `${w.classHe ?? w.class} · ${w.roleHe ?? w.role}` : `${w.class} · ${w.role}`);

export const wName = (w: Wrestler, lang: Lang) => (lang === 'he' ? w.nameHe : w.name);

export function Mic({ value }: { value: number }) {
  return <Text style={{ color: C.gold, fontSize: 12 }}>{'●'.repeat(value)}<Text style={{ color: C.line }}>{'●'.repeat(5 - value)}</Text></Text>;
}

export const s = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  btnText: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  card: { backgroundColor: C.panel, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, gap: 8 },
  pill: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  barBg: { height: 6, backgroundColor: C.panel2, borderRadius: 3, overflow: 'hidden', minWidth: 50, flex: 1 },
  barFg: { height: 6, borderRadius: 3 },
});
