import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
  Vibration,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors, spacing, fontSize, radius } from '../lib/theme';
import { useStore } from '../store/useStore';

export function TimerScreen() {
  const timerState = useStore(s => s.timerState);
  const timeRemaining = useStore(s => s.timeRemaining);
  const isBreak = useStore(s => s.isBreak);
  const activeGoal = useStore(s => s.activeGoal);
  const activeDailyTaskId = useStore(s => s.activeDailyTaskId);
  const dailyTasks = useStore(s => s.dailyTasks);
  const pomodorosCompletedToday = useStore(s => s.pomodorosCompletedToday);
  const user = useStore(s => s.user);

  const startTimer = useStore(s => s.startTimer);
  const pauseTimer = useStore(s => s.pauseTimer);
  const resumeTimer = useStore(s => s.resumeTimer);
  const tickTimer = useStore(s => s.tickTimer);
  const skipBreak = useStore(s => s.skipBreak);
  const resetTimer = useStore(s => s.resetTimer);
  const stopTimerOnBackground = useStore(s => s.stopTimerOnBackground);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Keep screen awake while timer is running ──
  useEffect(() => {
    if (timerState === 'running') {
      activateKeepAwakeAsync('timer').catch(() => {});
    } else {
      deactivateKeepAwake('timer');
    }
    return () => { deactivateKeepAwake('timer'); };
  }, [timerState]);

  // ── Tick the timer every second ──
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  // ── CRITICAL: Stop timer when app goes to background ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // App just went to background — stop the timer
        stopTimerOnBackground();
        Vibration.vibrate(500); // Haptic feedback
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // ── Vibrate on session complete ──
  useEffect(() => {
    if (isBreak && timerState === 'running') {
      // Just transitioned to break — session completed
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [isBreak]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const focusDuration = user?.settings.focus_duration || 25 * 60;
  const totalDuration = isBreak ? (user?.settings.break_duration || 300) : focusDuration;
  const progress = 1 - timeRemaining / totalDuration;

  const activeTask = dailyTasks.find(t => t.id === activeDailyTaskId);
  const contextLabel = activeTask?.title || activeGoal?.title || 'Focus Session';

  return (
    <View style={styles.container}>
      {/* Status label */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isBreak ? styles.statusBreak : timerState === 'running' ? styles.statusActive : styles.statusIdle]} />
        <Text style={styles.statusText}>
          {isBreak ? 'Break Time' : timerState === 'running' ? 'Focusing' : timerState === 'paused' ? 'Paused' : 'Ready'}
        </Text>
      </View>

      {/* Context */}
      <Text style={styles.contextLabel} numberOfLines={1}>{contextLabel}</Text>

      {/* Timer Ring */}
      <View style={styles.timerContainer}>
        {/* Background ring */}
        <View style={styles.ring}>
          {/* Progress arc (simplified — uses a border trick) */}
          <View style={[styles.ringProgress, { opacity: progress }]} />
          <View style={styles.ringInner}>
            <Text style={[styles.timerText, isBreak && styles.timerBreakText]}>{timeStr}</Text>
            <Text style={styles.timerSubtext}>
              {isBreak ? 'until next session' : timerState === 'idle' ? 'tap to start' : 'remaining'}
            </Text>
          </View>
        </View>
      </View>

      {/* Pomodoro count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>{pomodorosCompletedToday}</Text>
        <Text style={styles.countLabel}>pomodoros today</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {timerState === 'idle' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Focus</Text>
          </TouchableOpacity>
        )}

        {timerState === 'running' && !isBreak && (
          <View style={styles.runningControls}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={pauseTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Pause</Text>
            </TouchableOpacity>
          </View>
        )}

        {timerState === 'paused' && (
          <View style={styles.runningControls}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={resumeTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}

        {timerState === 'running' && isBreak && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={skipBreak}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Skip Break</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Background warning */}
      {timerState === 'running' && !isBreak && (
        <Text style={styles.warningText}>
          Leaving the app will stop your timer
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: colors.green,
  },
  statusBreak: {
    backgroundColor: colors.cyan,
  },
  statusIdle: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contextLabel: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    maxWidth: '80%',
    textAlign: 'center',
  },
  timerContainer: {
    marginBottom: spacing.xl,
  },
  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: colors.cyan,
  },
  ringInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize.hero,
    fontWeight: '200',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timerBreakText: {
    color: colors.cyan,
  },
  timerSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  countText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.cyan,
  },
  countLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  controls: {
    width: '100%',
    maxWidth: 320,
  },
  runningControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.orange,
    marginTop: spacing.lg,
    textAlign: 'center',
    opacity: 0.7,
  },
});
