import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

type ReportTab = 'daily' | 'weekly' | 'monthly' | 'goals';

interface SessionRow {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  status: string;
  goal_id: string | null;
}

interface GoalRow {
  id: string;
  title: string;
  sessions_completed: number;
  estimated_sessions_current: number;
  status: string;
  created_at: string;
}

export function ReportsScreen() {
  const user = useStore(s => s.user);
  const [tab, setTab] = useState<ReportTab>('daily');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Determine date range based on tab
      const now = new Date();
      let startDate: string;

      if (tab === 'daily') {
        startDate = now.toISOString().split('T')[0];
      } else if (tab === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
      } else if (tab === 'monthly') {
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = monthAgo.toISOString().split('T')[0];
      } else {
        startDate = '2020-01-01'; // All time for goals
      }

      const [sessionsRes, goalsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('start_time', `${startDate}T00:00:00`)
          .order('start_time', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'abandoned')
          .order('created_at', { ascending: false }),
      ]);

      setSessions((sessionsRes.data || []) as SessionRow[]);
      setGoals((goalsRes.data || []) as GoalRow[]);
    } catch (err) {
      console.warn('Reports fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalMinutes = Math.round(
    sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
  );
  const totalSessions = sessions.length;
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group sessions by day for daily/weekly views
  const sessionsByDay: Record<string, SessionRow[]> = {};
  sessions.forEach(s => {
    const day = s.start_time.split('T')[0];
    if (!sessionsByDay[day]) sessionsByDay[day] = [];
    sessionsByDay[day].push(s);
  });
  const sortedDays = Object.keys(sessionsByDay).sort((a, b) => b.localeCompare(a));

  // Average per day for weekly/monthly
  const daysWithData = sortedDays.length || 1;
  const avgPerDay = (totalSessions / daysWithData).toFixed(1);

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'Week' },
    { id: 'monthly', label: 'Month' },
    { id: 'goals', label: 'Goals' },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Tab Row */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabButton, tab === t.id && styles.tabButtonActive]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.cyan} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Goals Tab */}
          {tab === 'goals' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Long Term Goals</Text>
              {goals.length === 0 ? (
                <Text style={styles.emptyText}>No goals yet</Text>
              ) : (
                goals.map(goal => {
                  const progress = goal.estimated_sessions_current > 0
                    ? Math.round((goal.sessions_completed / goal.estimated_sessions_current) * 100)
                    : 0;
                  const statusColor = goal.status === 'completed'
                    ? colors.green
                    : goal.status === 'active'
                    ? colors.cyan
                    : colors.orange;
                  return (
                    <View key={goal.id} style={styles.goalCard}>
                      <View style={styles.goalHeader}>
                        <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {goal.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
                      </View>
                      <View style={styles.goalMeta}>
                        <Text style={styles.goalMetaText}>
                          {goal.sessions_completed} / {goal.estimated_sessions_current} sessions
                        </Text>
                        <Text style={styles.goalMetaText}>{progress}%</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{totalSessions}</Text>
                  <Text style={styles.summaryLabel}>Sessions</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{totalHours}h</Text>
                  <Text style={styles.summaryLabel}>Focus Time</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{avgPerDay}</Text>
                  <Text style={styles.summaryLabel}>Avg / Day</Text>
                </View>
              </View>

              {/* Session List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tab === 'daily' ? "Today's Sessions" : tab === 'weekly' ? 'This Week' : 'This Month'}
                </Text>

                {sortedDays.length === 0 ? (
                  <Text style={styles.emptyText}>No completed sessions yet</Text>
                ) : (
                  sortedDays.map(day => {
                    const daySessions = sessionsByDay[day];
                    const dayMinutes = Math.round(
                      daySessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 60
                    );
                    return (
                      <View key={day} style={styles.dayGroup}>
                        {tab !== 'daily' && (
                          <View style={styles.dayHeader}>
                            <Text style={styles.dayLabel}>{formatDate(day)}</Text>
                            <Text style={styles.dayMeta}>
                              {daySessions.length} sessions · {dayMinutes}m
                            </Text>
                          </View>
                        )}
                        {daySessions.map(session => {
                          const mins = Math.round((session.duration || 0) / 60);
                          return (
                            <View key={session.id} style={styles.sessionRow}>
                              <View style={styles.sessionDot} />
                              <Text style={styles.sessionTime}>{formatTime(session.start_time)}</Text>
                              <Text style={styles.sessionDuration}>{mins}m focus</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}

          {/* Bottom spacer */}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.cyanDim,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.cyan,
  },

  // Scroll
  scrollContent: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.cyan,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Day group
  dayGroup: {
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  dayMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Session row
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
  },
  sessionTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 72,
  },
  sessionDuration: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },

  // Goal card
  goalCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 2,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Empty
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
