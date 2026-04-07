import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../lib/theme';
import { useStore } from '../store/useStore';
import { DailyTask } from '../types';

export function TasksScreen() {
  const dailyTasks = useStore(s => s.dailyTasks);
  const activeDailyTaskId = useStore(s => s.activeDailyTaskId);
  const fetchDailyTasks = useStore(s => s.fetchDailyTasks);
  const toggleTaskComplete = useStore(s => s.toggleTaskComplete);
  const setActiveDailyTask = useStore(s => s.setActiveDailyTask);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDailyTasks();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDailyTasks();
  }, []);

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const totalPomodoros = dailyTasks.reduce((sum, t) => sum + t.pomodoros_done, 0);

  const renderTask = ({ item }: { item: DailyTask }) => {
    const isActive = item.id === activeDailyTaskId;
    const pomProgress = item.pomodoros_target > 0
      ? Math.min(1, item.pomodoros_done / item.pomodoros_target)
      : 0;

    return (
      <TouchableOpacity
        style={[
          styles.taskCard,
          isActive && styles.taskCardActive,
          item.completed && styles.taskCardCompleted,
        ]}
        onPress={() => setActiveDailyTask(isActive ? null : item.id)}
        onLongPress={() => toggleTaskComplete(item.id)}
        activeOpacity={0.7}
      >
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, item.completed && styles.checkboxDone]}
          onPress={() => toggleTaskComplete(item.id)}
        >
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {/* Pomodoro dots */}
          <View style={styles.pomodoroRow}>
            {Array.from({ length: item.pomodoros_target }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pomDot,
                  i < item.pomodoros_done && styles.pomDotFilled,
                ]}
              />
            ))}
            <Text style={styles.pomText}>
              {item.pomodoros_done}/{item.pomodoros_target}
            </Text>
          </View>
        </View>

        {/* Active indicator */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeText}>▶</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Tasks</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completedCount}/{dailyTasks.length}</Text>
            <Text style={styles.statLabel}>done</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalPomodoros}</Text>
            <Text style={styles.statLabel}>pomodoros</Text>
          </View>
        </View>
      </View>

      {/* Task list */}
      <FlatList
        data={dailyTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks for today</Text>
            <Text style={styles.emptySubtext}>
              Add tasks from the web dashboard{'\n'}and they'll appear here
            </Text>
          </View>
        }
      />

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          Tap a task to set it as your focus target. Long press to mark complete.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.cyan,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  taskCardActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  taskCardCompleted: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  pomodoroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pomDotFilled: {
    backgroundColor: colors.cyan,
  },
  pomText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  activeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cyanDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: {
    color: colors.cyan,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  tipText: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    textAlign: 'center',
  },
});
