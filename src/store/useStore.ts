import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Goal, DailyTask, TimerState, DEFAULT_SETTINGS } from '../types';

type DashboardMode = 'daily' | 'longterm';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Goals
  activeGoal: Goal | null;
  goals: Goal[];

  // Timer
  timerState: TimerState;
  timeRemaining: number;
  currentSessionId: string | null;
  isBreak: boolean;
  pomodorosCompletedToday: number;

  // Daily Tasks
  dashboardMode: DashboardMode;
  dailyTasks: DailyTask[];
  activeDailyTaskId: string | null;
  activeGoalId: string | null; // For longterm mode — which goal to start timer for

  // Actions
  initializeApp: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  fetchGoals: () => Promise<void>;
  fetchDailyTasks: (date?: string) => Promise<void>;
  setDashboardMode: (mode: DashboardMode) => void;

  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tickTimer: () => void;
  completeTimerSession: () => Promise<void>;
  skipBreak: () => void;
  resetTimer: () => void;
  stopTimerOnBackground: () => void;

  toggleTaskComplete: (taskId: string) => Promise<void>;
  deleteDailyTask: (taskId: string) => Promise<void>;
  setActiveDailyTask: (taskId: string | null) => void;
  setActiveGoalId: (goalId: string | null) => void;
  addDailyTask: (title: string, pomodorosTarget?: number) => Promise<void>;
  addGoal: (title: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeGoal: null,
  goals: [],
  timerState: 'idle',
  timeRemaining: 25 * 60,
  currentSessionId: null,
  isBreak: false,
  pomodorosCompletedToday: 0,
  dashboardMode: 'daily',
  dailyTasks: [],
  activeDailyTaskId: null,
  activeGoalId: null,

  initializeApp: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        set({ isLoading: false });
        return;
      }

      const user: User = {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || session.user.email || '',
        onboarding_completed: profile.onboarding_completed,
        settings: {
          focus_duration: profile.focus_duration || DEFAULT_SETTINGS.focus_duration,
          break_duration: profile.break_duration || DEFAULT_SETTINGS.break_duration,
          notifications_enabled: profile.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
          sound_enabled: profile.sound_enabled ?? DEFAULT_SETTINGS.sound_enabled,
          theme: profile.theme || DEFAULT_SETTINGS.theme,
        },
      };

      set({ user, isAuthenticated: true, isLoading: false });

      // Fetch goals and tasks in parallel
      await Promise.all([
        get().fetchGoals(),
        get().fetchDailyTasks(),
      ]);
    } catch (err) {
      console.warn('Init failed:', err);
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await get().initializeApp();
    return {};
  },

  signUp: async (name, email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    // After signup, sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: 'Account created! Please check your email to verify, then sign in.' };
    await get().initializeApp();
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      isAuthenticated: false,
      activeGoal: null,
      goals: [],
      timerState: 'idle',
      timeRemaining: 25 * 60,
      currentSessionId: null,
      isBreak: false,
      dashboardMode: 'daily',
      dailyTasks: [],
      activeDailyTaskId: null,
      activeGoalId: null,
      pomodorosCompletedToday: 0,
    });
  },

  fetchGoals: async () => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'abandoned')
      .order('created_at', { ascending: false });

    const goals = (data || []) as Goal[];
    const activeGoal = goals.find(g => g.status === 'active') || null;
    set({ goals, activeGoal });
  },

  fetchDailyTasks: async (date?: string) => {
    const { user } = get();
    if (!user) return;

    const todayKey = date || new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayKey)
      .order('sort_order');

    const tasks: DailyTask[] = (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      title: d.title as string,
      completed: d.completed as boolean,
      repeating: d.repeating as boolean,
      pomodoros_target: d.pomodoros_target as number,
      pomodoros_done: d.pomodoros_done as number,
      date: d.date as string,
      tag: d.tag as string | undefined,
      completed_at: d.completed_at as string | undefined,
      sort_order: d.sort_order as number,
    }));

    set({ dailyTasks: tasks });
  },

  setDashboardMode: (mode) => set({ dashboardMode: mode }),
  setActiveGoalId: (goalId) => set({ activeGoalId: goalId }),

  startTimer: () => {
    const { user, activeGoal, dashboardMode, activeGoalId, goals } = get();
    if (!user) return;

    const focusDuration = user.settings.focus_duration || 25 * 60;

    // Determine which goal to track this session against
    let goalId: string;
    if (dashboardMode === 'longterm' && activeGoalId) {
      goalId = activeGoalId;
    } else if (activeGoal) {
      goalId = activeGoal.id;
    } else {
      goalId = '__daily__';
    }

    // Create session in Supabase
    supabase.from('sessions').insert({
      user_id: user.id,
      goal_id: goalId === '__daily__' ? null : goalId,
      start_time: new Date().toISOString(),
      duration: 0,
      status: 'active',
      device: 'mobile',
    }).select().single().then(({ data }) => {
      if (data) set({ currentSessionId: data.id as string });
    });

    // Save timer state to Supabase for cross-device awareness
    supabase.from('timer_state').upsert({
      user_id: user.id,
      goal_id: goalId === '__daily__' ? null : goalId,
      remaining: focusDuration,
      is_running: true,
      device: 'mobile',
    }).then(() => {});

    set({
      timerState: 'running',
      timeRemaining: focusDuration,
      isBreak: false,
    });
  },

  pauseTimer: () => {
    const { user, timeRemaining } = get();
    set({ timerState: 'paused' });

    if (user) {
      supabase.from('timer_state').upsert({
        user_id: user.id,
        remaining: timeRemaining,
        is_running: false,
        device: 'mobile',
      }).then(() => {});
    }
  },

  resumeTimer: () => {
    set({ timerState: 'running' });
    const { user, timeRemaining } = get();
    if (user) {
      supabase.from('timer_state').upsert({
        user_id: user.id,
        remaining: timeRemaining,
        is_running: true,
        device: 'mobile',
      }).then(() => {});
    }
  },

  tickTimer: () => {
    const { timeRemaining, timerState, isBreak, user } = get();
    if (timerState !== 'running') return;

    if (timeRemaining <= 1) {
      if (isBreak) {
        const focusDuration = user?.settings.focus_duration || 25 * 60;
        set({ timerState: 'idle', timeRemaining: focusDuration, isBreak: false });
        supabase.from('timer_state').delete().eq('user_id', user?.id || '').then(() => {});
      } else {
        get().completeTimerSession();
      }
      return;
    }

    set({ timeRemaining: timeRemaining - 1 });
  },

  completeTimerSession: async () => {
    const { currentSessionId, activeGoal, user, activeDailyTaskId, pomodorosCompletedToday } = get();
    if (!user) return;

    const focusDuration = user.settings.focus_duration || 25 * 60;
    const breakDuration = user.settings.break_duration || 5 * 60;

    // Complete the session in Supabase
    if (currentSessionId) {
      await supabase.from('sessions').update({
        status: 'completed',
        end_time: new Date().toISOString(),
        duration: focusDuration,
      }).eq('id', currentSessionId);
    }

    // Increment goal progress
    if (activeGoal) {
      await supabase.from('goals').update({
        sessions_completed: activeGoal.sessions_completed + 1,
      }).eq('id', activeGoal.id);

      set({
        activeGoal: {
          ...activeGoal,
          sessions_completed: activeGoal.sessions_completed + 1,
        },
      });
    }

    // Increment daily task pomodoro if one is active
    if (activeDailyTaskId) {
      const task = get().dailyTasks.find(t => t.id === activeDailyTaskId);
      if (task) {
        const newDone = task.pomodoros_done + 1;
        const autoComplete = newDone >= task.pomodoros_target;
        await supabase.from('daily_tasks').update({
          pomodoros_done: newDone,
          completed: autoComplete || task.completed,
          completed_at: autoComplete && !task.completed_at ? new Date().toISOString() : task.completed_at,
        }).eq('id', activeDailyTaskId);
      }
      // Refresh tasks
      get().fetchDailyTasks();
    }

    // Clear timer state in Supabase
    await supabase.from('timer_state').delete().eq('user_id', user.id);

    // Transition to break
    set({
      timerState: 'running',
      timeRemaining: breakDuration,
      isBreak: true,
      currentSessionId: null,
      pomodorosCompletedToday: pomodorosCompletedToday + 1,
    });
  },

  skipBreak: () => {
    const { user } = get();
    const focusDuration = user?.settings.focus_duration || 25 * 60;
    set({ timerState: 'idle', timeRemaining: focusDuration, isBreak: false });
  },

  resetTimer: () => {
    const { currentSessionId, user } = get();
    const focusDuration = user?.settings.focus_duration || 25 * 60;

    // Discard the active session
    if (currentSessionId) {
      supabase.from('sessions').update({ status: 'discarded' }).eq('id', currentSessionId).then(() => {});
    }
    if (user) {
      supabase.from('timer_state').delete().eq('user_id', user.id).then(() => {});
    }

    set({
      timerState: 'idle',
      timeRemaining: focusDuration,
      currentSessionId: null,
      isBreak: false,
    });
  },

  stopTimerOnBackground: () => {
    const { timerState, isBreak } = get();
    if (timerState === 'running' && !isBreak) {
      // Pause the session — user can resume when they return
      get().pauseTimer();
    } else if (timerState === 'running' && isBreak) {
      // Pause break too
      set({ timerState: 'paused' });
    }
  },

  toggleTaskComplete: async (taskId) => {
    const task = get().dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    const completed = !task.completed;
    await supabase.from('daily_tasks').update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', taskId);

    get().fetchDailyTasks();
  },

  setActiveDailyTask: (taskId) => set({ activeDailyTaskId: taskId }),

  deleteDailyTask: async (taskId) => {
    const { activeDailyTaskId } = get();
    await supabase.from('daily_tasks').delete().eq('id', taskId);
    if (activeDailyTaskId === taskId) set({ activeDailyTaskId: null });
    get().fetchDailyTasks();
  },

  addDailyTask: async (title, pomodorosTarget = 1) => {
    const { user } = get();
    if (!user || !title.trim()) return;

    const todayKey = new Date().toISOString().split('T')[0];
    const existing = get().dailyTasks;

    await supabase.from('daily_tasks').insert({
      user_id: user.id,
      title: title.trim(),
      pomodoros_target: pomodorosTarget,
      date: todayKey,
      sort_order: existing.length,
    });

    get().fetchDailyTasks();
  },

  addGoal: async (title) => {
    const { user } = get();
    if (!user || !title.trim()) return;

    await supabase.from('goals').insert({
      user_id: user.id,
      title: title.trim(),
      estimated_sessions_initial: 20,
      estimated_sessions_current: 20,
      sessions_completed: 0,
      user_time_bias: 0,
      experience_level: 'intermediate',
      daily_availability: 2,
      consistency_level: 'medium',
      confidence_score: 0.6,
      difficulty: 'moderate',
      recommended_sessions_per_day: 2,
      estimated_days: 10,
      status: 'active',
    });

    await get().fetchGoals();
  },
}));
