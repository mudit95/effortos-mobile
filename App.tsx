import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './src/store/useStore';
import { AuthScreen } from './src/screens/AuthScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';

const colors = {
  bg: '#0a0a0f',
  bgCard: '#111118',
  border: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.3)',
  cyan: '#06b6d4',
  cyanDim: 'rgba(6,182,212,0.15)',
};

type Tab = 'timer' | 'reports';

function TabBar({ activeTab, onTabPress }: { activeTab: Tab; onTabPress: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'timer', label: 'Timer', icon: '⏱' },
    { id: 'reports', label: 'Reports', icon: '📊' },
  ];

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[tabStyles.tab, activeTab === tab.id && tabStyles.tabActive]}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={tabStyles.tabIcon}>{tab.icon}</Text>
          <Text style={[
            tabStyles.tabLabel,
            activeTab === tab.id && tabStyles.tabLabelActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabActive: {},
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.cyan,
  },
});

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const isLoading = useStore(s => s.isLoading);
  const initializeApp = useStore(s => s.initializeApp);

  useEffect(() => {
    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuth={() => {}} />;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top']}>
        {activeTab === 'timer' && <TimerScreen />}
        {activeTab === 'reports' && <ReportsScreen />}
      </SafeAreaView>
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
