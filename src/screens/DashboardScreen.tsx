import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, fontSize } from '../lib/theme';

const WEB_APP_URL = 'https://effortos-zeta.vercel.app';

export function DashboardScreen() {
  const webViewRef = useRef<WebView>(null);

  const injectedJS = `
    (function() {
      // Signal to the web app that it's inside the mobile app
      window.__EFFORTOS_MOBILE__ = true;

      // Try to hide the landing page nav if user is already authenticated
      // The web app will handle auth via its own Supabase client
      true;
    })();
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        )}
        // Share cookies/storage so Supabase auth persists
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // Handle navigation — keep within the app
        onShouldStartLoadWithRequest={(request) => {
          // Allow navigation within the EffortOS domain
          if (request.url.startsWith(WEB_APP_URL)) return true;
          if (request.url.startsWith('https://muqavvntwzwzbxuxefre.supabase.co')) return true;
          // Block external navigation
          return false;
        }}
      />

      {/* Refresh button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => webViewRef.current?.reload()}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshText}>↻</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  refreshButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
