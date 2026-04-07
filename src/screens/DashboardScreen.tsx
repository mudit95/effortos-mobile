import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, fontSize } from '../lib/theme';
import { supabase } from '../lib/supabase';

const WEB_APP_URL = 'https://effortos-zeta.vercel.app';

export function DashboardScreen() {
  const webViewRef = useRef<WebView>(null);
  const [sessionData, setSessionData] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the current Supabase session to inject into the WebView
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionData({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
      setLoading(false);
    })();
  }, []);

  // JavaScript to inject into the WebView that sets the Supabase session
  // in localStorage so the web app picks it up automatically
  const getInjectedJS = () => {
    if (!sessionData) return 'true;';

    return `
      (function() {
        try {
          // The Supabase JS client stores the session in localStorage under this key
          var storageKey = 'sb-muqavvntwzwzbxuxefre-auth-token';
          var sessionObj = {
            access_token: '${sessionData.access_token}',
            refresh_token: '${sessionData.refresh_token}',
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          };
          localStorage.setItem(storageKey, JSON.stringify(sessionObj));

          // Signal to the web app that it's inside the mobile app
          window.__EFFORTOS_MOBILE__ = true;

          // Reload to pick up the session
          if (!window.__EFFORTOS_SESSION_SET__) {
            window.__EFFORTOS_SESSION_SET__ = true;
            window.location.reload();
          }
        } catch(e) {
          console.warn('Session injection failed:', e);
        }
        true;
      })();
    `;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        injectedJavaScript={getInjectedJS()}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        )}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith(WEB_APP_URL)) return true;
          if (request.url.includes('supabase.co')) return true;
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
