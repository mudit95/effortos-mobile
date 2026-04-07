import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../lib/theme';
import { useStore } from '../store/useStore';

interface Props {
  onAuth: () => void;
}

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = useStore(s => s.signIn);
  const signUp = useStore(s => s.signUp);

  const handleSubmit = async () => {
    setError('');
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name');
    if (!email.trim()) return setError('Please enter your email');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      const result = mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(name.trim(), email.trim(), password);

      if (result.error) {
        setError(result.error);
      } else {
        onAuth();
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.title}>EffortOS</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
          }}
        >
          <Text style={styles.toggleText}>
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={styles.toggleLink}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  errorContainer: {
    backgroundColor: colors.redDim,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.cyan,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  toggle: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  toggleLink: {
    color: colors.cyan,
    fontWeight: '500',
  },
});
