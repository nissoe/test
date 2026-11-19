// מציב את הזירה החיה מאחורי כל המסכים (בווב; במובייל המקומי נחבר expo-gl בהמשך).
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mountArena } from './arena.ts';

export function Arena() {
  const host = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = host.current as unknown as HTMLElement;
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    el.appendChild(canvas);
    const stop = mountArena(canvas);
    return () => { stop(); canvas.remove(); };
  }, []);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <View ref={host} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {/* הצללה עדינה כדי שהטקסט יהיה קריא מעל הזירה */}
      <LinearGradient colors={['#000000aa', '#00000022', '#00000055', '#000000cc']} locations={[0, 0.25, 0.6, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}
