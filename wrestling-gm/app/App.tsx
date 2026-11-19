// LWF GM — אב-טיפוס ראשון שאפשר לשחק: פתיחה, דראפט, תוכנית שבועית, תוצאות וסוף עונה.
import { StatusBar } from 'expo-status-bar';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { Draft } from './src/screens/Draft.tsx';
import { Hub } from './src/screens/Hub.tsx';
import { Results, SeasonEnd } from './src/screens/Results.tsx';
import { Setup } from './src/screens/Setup.tsx';
import { GameProvider, useStore } from './src/store.tsx';
import { C } from './src/ui.tsx';

function Shell() {
  const { phase, lang, setLang, t } = useStore();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, direction: lang === 'he' ? 'rtl' : 'ltr' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={{ color: C.gold, fontWeight: '900', fontStyle: 'italic', fontSize: 18, letterSpacing: 2 }}>LWF GM</Text>
          <Pressable onPress={() => setLang(lang === 'en' ? 'he' : 'en')}>
            <Text style={{ color: C.muted, fontWeight: '700' }}>{t('language')}</Text>
          </Pressable>
        </View>
        {phase === 'setup' ? <Setup /> : phase === 'draft' ? <Draft /> : phase === 'hub' ? <Hub /> : phase === 'results' ? <Results /> : <SeasonEnd />}
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
