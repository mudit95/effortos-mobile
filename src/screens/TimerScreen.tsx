import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
  Vibration,
  ScrollView,
  FlatList,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors, spacing, fontSize, radius } from '../lib/theme';
import { useStore } from '../store/useStore';

export function TimerScreen() {
  const timerState = useStore(s => s.timerState);
  const timeRemaining = useStore(s => s.timeRemaining);
  const isBreak = useStore(s => s.isBreak);
  const activeGoal = useStore(s => s.activeGoal);
  const goals = useStore(s => s.goals);
  const activeDailyTaskId = useStore(s => s.activeDailyTaskId);
  const activeGoalId = useStore(s => s.activeGoalId);
  const dailyTasks = useStore(s => s.dailyTasks);
  const pomodorosCompletedToday = useStore(s => s.pomodorosCompletedToday);
  const user = useStore(s => s.user);
  const dashboardMode = useStore(s => s.dashboardMode);

  const startTimer = useStore(s => s.startTimer);
  const pauseTimer = useStore(s => s.pauseTimer);
  const resumeTimer = useStore(s => s.resumeTimer);
  const tickTimer = useStore(s => s.tickTimer);
  const skipBreak = useStore(s => s.skipBreak);
  const resetTimer = useStore(s => s.resetTimer);
  const stopTimerOnBackground = useStore(s => s.stopTimerOnBackground);
  const setDashboardMode = useStore(s => s.setDashboardMode);
  const setActiveDailyTask = useStore(s => s.setActiveDailyTask);
  const setActiveGoalId = useStore(s => s.setActiveGoalId);
  const toggleTaskComplete = useStore(s => s.toggleTaskComplete);
  const fetchDailyTasks = useStore(s => s.fetchDailyTasks);
  const fetchGoals = useStore(s => s.fetchGoals);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fetch data on mount
  useEffect(() => {
    fetchDailyTasks();
    fetchGoals();
  }, []);

  // Keep screen awake while timer is running
  useEffect(() => {
    if (timerState === 'running') {
      activateKeepAwakeAsync('timer').catch(() => {});
    } else {
      deactivateKeepAwake('timer');
    }
    return () => { deactivateKeepAwake('timer'); };
  }, [timerState]);

  // Tick the timer every second
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => tickTimer(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerState]);

  // CRITICAL: Pause timer when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        stopTimerOnBackground();
        Vibration.vibrate(500);
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Vibrate on session complete
  useEffect(() => {
    if (isBreak && timerState === 'running') {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [isBreak]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // What's selected for this session
  const selectedTask = dailyTasks.find(t => t.id === activeDailyTaskId);
  const selectedGoal = goals.find(g => g.id === activeGoalId);
  const contextLabel = dashboardMode === 'daily'
    ? (selectedTask?.title || 'Pick a task below')
    : (selectedGoal?.title || activeGoal?.title || 'Pick a goal below');

  const canStart = dashboardMode === 'daily'
    ? !!activeDailyTaskId
    : !!(activeGoalId || activeGoal);

  const isTimerActive = timerState !== 'idle';

  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'paused');
  const incompleteTasks = dailyTasks.filter(t => !t.completed);

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      {!isTimerActive && (
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, dashboardMode === 'daily' && styles.modeButtonActive]}
            onPress={() => setDashboardMode('daily')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeText, dashboardMode === 'daily' && styles.modeTextActive]}>
              Daily Grind
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, dashboardMode === 'longterm' && styles.modeButtonActive]}
            onPress={() => setDashboardMode('longterm')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeText, dashboardMode === 'longterm' && styles.modeTextActive]}>
              Long Term
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timer Section */}
      <View style={styles.timerSection}>
        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isBreak ? styles.statusBreak : timerState === 'running' ? styles.statusActive : timerState === 'paused' ? styles.statusPaused : styles.statusIdle]} />
          <Text style={styles.statusText}>
            {isBreak ? 'Break' : timerState === 'running' ? 'Focusing' : timerState === 'paused' ? 'Paused' : 'Ready'}
          </Text>
        </View>

        {/* Context */}
        <Text style={styles.contextLabel} numberOfLines={1}>{contextLabel}</Text>

        {/* Timer Display */}
        <View style={styles.ring}>
          <Text style={[styles.timerText, isBreak && styles.timerBreakText]}>{timeStr}</Text>
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
              style={[styles.primaryButton, !canStart && styles.buttonDisabled]}
              onPress={canStart ? startTimer : undefined}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Start Focus</Text>
            </TouchableOpacity>
          )}

          {timerState === 'running' && !isBreak && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.secondaryButton} onPress={resetTimer} activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={pauseTimer} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Pause</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'paused' && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.secondaryButton} onPress={resetTimer} activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={resumeTimer} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Resume</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'running' && isBreak && (
            <TouchableOpacity style={styles.secondaryButton} onPress={skipBreak} activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>Skip Break</Text>
            </TouchableOpacity>
          )}
        </View>

        {timerState === 'running' && !isBreak && (
          <Text style={styles.warningText}>Leaving the app will pause your timer</Text>
        )}
      </View>

      {/* Task/Goal Picker — only show when timer is idle */}
      {!isTimerActive && (
        <View style={styles.pickerSection}>
          <Text style={styles.pickerTitle}>
            {dashboardMode === 'daily' ? 'Pick a task to focus on' : 'Pick a goal to work on'}
          </Text>

          {dashboardMode === 'daily' ? (
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {incompleteTasks.length === 0 && (
                <Text style={styles.emptyText}>No tasks for today — add them from the web dashboard</Text>
              )}
              {incompleteTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.pickerItem, task.id === activeDailyTaskId && styles.pickerItemActive]}
                  onPress={() => setActiveDailyTask(task.id === activeDailyTaskId ? null : task.id)}
                  onLongPress={() => toggleTaskComplete(task.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pickerItemLeft}>
                    <View style={[styles.pickerDot, task.id === activeDailyTaskId && styles.pickerDotActive]} />
                    <Text style={[styles.pickerItemText, task.id === activeDailyTaskId && styles.pickerItemTextActive]} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </View>
                  <Text style={styles.pickerItemMeta}>
                    {task.pomodoros_done}/{task.pomodoros_target}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {activeGoals.length === 0 && (
                <Text style={styles.emptyText}>No active goals — create one from the web dashboard</Text>
              )}
              {activeGoals.map(goal => {
                const progress = goal.estimated_sessions_current > 0
                  ? Math.round((goal.sessions_completed / goal.estimated_sessions_current) * 100)
                  : 0;
                const isSelected = goal.id === activeGoalId;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => setActiveGoalId(isSelected ? null : goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={[styles.pickerDot, isSelected && styles.pickerDotActive]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]} numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <View style={styles.miniProgress}>
                          <View style={[styles.miniProgressFill, { width: `${Math.min(100, progress)}%` }]} />
                        </View>
                      </View>
                    </View>
                    <Text style={styles.pickerItemMeta}>{progress}%</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.cyanDim,
  },
  modeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.cyan,
  },

  // Timer Section
  timerSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: { backgroundColor: colors.green },
  statusBreak: { backgroundColor: colors.cyan },
  statusPaused: { backgroundColor: colors.orange },
  statusIdle: { backgroundColor: colors.textMuted },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contextLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    maxWidth: '80%',
    textAlign: 'center',
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timerBreakText: {
    color: colors.cyan,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    maxWidth: 300,
    paddingHorizontal: spacing.lg,
  },
  runningControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.orange,
    marginTop: spacing.md,
    opacity: 0.7,
  },

  // Picker Section
  pickerSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pickerTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerList: {
    flex: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  pickerItemActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  pickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  pickerDotActive: {
    borderColor: colors.cyan,
    backgroundColor: colors.cyan,
  },
  pickerItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  pickerItemTextActive: {
    color: colors.cyanLight,
  },
  pickerItemMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  miniProgress: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    lineHeight: 20,
  },
});
