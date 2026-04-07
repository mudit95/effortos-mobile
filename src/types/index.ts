// Shared types (mirrors web app types relevant to mobile)

export interface User {
  id: string;
  name: string;
  email: string;
  onboarding_completed: boolean;
  settings: UserSettings;
}

export interface UserSettings {
  focus_duration: number;   // seconds, default 1500 (25 min)
  break_duration: number;   // seconds, default 300 (5 min)
  notifications_enabled: boolean;
  sound_enabled: boolean;
  theme: 'dark' | 'light';
}

export const DEFAULT_SETTINGS: UserSettings = {
  focus_duration: 1500,
  break_duration: 300,
  notifications_enabled: true,
  sound_enabled: true,
  theme: 'dark',
};

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  estimated_sessions_current: number;
  sessions_completed: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  created_at: string;
}

export interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
  repeating: boolean;
  pomodoros_target: number;
  pomodoros_done: number;
  date: string;
  tag?: string;
  completed_at?: string;
  sort_order: number;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'break';
