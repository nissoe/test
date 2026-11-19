// LWF GM — אב-טיפוס: פתיחה, דראפט, תוכנית שבועית, תוצאות וסוף עונה.
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { SecularOne_400Regular } from '@expo-google-fonts/secular-one/400Regular';
import { Rubik_400Regular } from '@expo-google-fonts/rubik/400Regular';
import { Rubik_700Bold } from '@expo-google-fonts/rubik/700Bold';
import { Rubik_800ExtraBold } from '@expo-google-fonts/rubik/800ExtraBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed/800ExtraBold_Italic';
import { Arena } from './src/arena/Arena.tsx';
import { arena } from './src/arena/arena.ts';
import { Draft } from './src/screens/Draft.tsx';
import { Hub } from './src/screens/Hub.tsx';
import { Results, SeasonEnd } from './src/screens/Results.tsx';
import { Setup } from './src/screens/Setup.tsx';
import { GameProvider, useStore } from './src/store.tsx';
import { C, Head } from './src/ui.tsx';
import * as sfx from './src/sfx.ts';

function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 24, color: C.gold, fontStyle: 'italic', letterSpacing: 2, textShadowColor: '#E2B84B88', textShadowRadius: 12 }}>LWF</Text>
      <Text style={{ fontFamily: 'BarlowCondensed_800ExtraBold_Italic', fontSize: 16, color: C.steel, letterSpacing: 3 }}>GM</Text>
    </View>
  );
}

function Shell() {
  const { phase, lang, setLang, t } = useStore();
  const [muted, setMuted] = useState(sfx.isMuted());
  useEffect(() => sfx.onMute(setMuted), []);
  useEffect(() => { arena.side(lang === 'he' ? 'start' : 'end'); }, [lang]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* הזירה החיה מאחורי כל המסכים */}
      <Arena />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, direction: lang === 'he' ? 'rtl' : 'ltr' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff12', backgroundColor: '#05060Acc' }}>
            <Logo />
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <Pressable onPress={() => sfx.setMuted(!muted)} hitSlop={8}>
                <Text style={{ fontSize: 18, color: muted ? C.muted : C.gold }}>{muted ? '🔇' : '🔊'}</Text>
              </Pressable>
              <Pressable onPress={() => { sfx.click(); setLang(lang === 'en' ? 'he' : 'en'); }} hitSlop={8}>
                <Head size={14} color={C.steel}>{t('language')}</Head>
              </Pressable>
            </View>
          </View>
          {phase === 'setup' ? <Setup /> : phase === 'draft' ? <Draft /> : phase === 'hub' ? <Hub /> : phase === 'results' ? <Results /> : <SeasonEnd />}
        </View>
      </SafeAreaView>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Anton_400Regular,
    SecularOne_400Regular,
    Rubik_400Regular,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_800ExtraBold_Italic,
  });
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
