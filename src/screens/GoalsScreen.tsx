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
import { Goal } from '../types';

export function GoalsScreen() {
  const goals = useStore(s => s.goals);
  const activeGoal = useStore(s => s.activeGoal);
  const fetchGoals = useStore(s => s.fetchGoals);
  const user = useStore(s => s.user);
  const signOut = useStore(s => s.signOut);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const getProgress = (goal: Goal) => {
    if (goal.estimated_sessions_current <= 0) return 0;
    return Math.min(100, Math.round((goal.sessions_completed / goal.estimated_sessions_current) * 100));
  };

  const renderGoal = ({ item }: { item: Goal }) => {
    const progress = getProgress(item);
    const isActive = item.id === activeGoal?.id;

    return (
      <View style={[styles.goalCard, isActive && styles.goalCardActive]}>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}

        <Text style={styles.goalTitle} numberOfLines={2}>{item.title}</Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.goalStats}>
          <Text style={styles.goalStatText}>
            {item.sessions_completed}/{item.estimated_sessions_current} sessions
          </Text>
          <Text style={[styles.goalStatText, { color: colors.cyan }]}>
            {progress}%
          </Text>
        </View>

        <View style={styles.goalMeta}>
          <View style={[
            styles.statusPill,
            item.status === 'active' ? styles.statusActive :
            item.status === 'completed' ? styles.statusCompleted :
            styles.statusPaused,
          ]}>
            <Text style={[
              styles.statusPillText,
              item.status === 'active' ? { color: colors.green } :
              item.status === 'completed' ? { color: colors.cyan } :
              { color: colors.orange },
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with user info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name || 'there'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Your Goals</Text>

      <FlatList
        data={goals}
        renderItem={renderGoal}
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
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySubtext}>
              Create goals from the web dashboard{'\n'}and track them here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  goalCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  goalCardActive: {
    borderColor: colors.cyan,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cyanDim,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  activeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.cyan,
    letterSpacing: 1,
  },
  goalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 3,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  goalStatText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusActive: {
    backgroundColor: colors.greenDim,
  },
  statusCompleted: {
    backgroundColor: colors.cyanDim,
  },
  statusPaused: {
    backgroundColor: colors.orangeDim,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
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
});
