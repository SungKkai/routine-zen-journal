export const AVATARS = [
  { key: 'wanderer', glyph: '🧭', name: 'Wanderer', requirement: 'Ready from day one', unlock: () => true },
  { key: 'scout', glyph: '🏹', name: 'Scout', requirement: 'Complete 10 tasks', unlock: (s: RewardStats) => s.tasks >= 10 },
  { key: 'mage', glyph: '🔮', name: 'Time Mage', requirement: 'Focus for 5 hours', unlock: (s: RewardStats) => s.focusHours >= 5 },
  { key: 'ranger', glyph: '🌿', name: 'Streak Ranger', requirement: 'Reach a 7-day streak', unlock: (s: RewardStats) => s.streak >= 7 },
  { key: 'knight', glyph: '🛡️', name: 'Task Knight', requirement: 'Complete 50 tasks', unlock: (s: RewardStats) => s.tasks >= 50 },
  { key: 'sage', glyph: '🦉', name: 'Daily Sage', requirement: 'Visit on 30 days', unlock: (s: RewardStats) => s.loginDays >= 30 },
] as const;
export const BACKGROUNDS = [
  { key: 'plain', name: 'Quiet paper', requirement: 'Ready from day one', unlock: () => true },
  { key: 'grid', name: 'Tactician grid', requirement: 'Complete 10 tasks', unlock: (s: RewardStats) => s.tasks >= 10 },
  { key: 'dawn', name: 'Ember dawn', requirement: 'Focus for 5 hours', unlock: (s: RewardStats) => s.focusHours >= 5 },
  { key: 'forest', name: 'Deep forest', requirement: 'Reach a 7-day streak', unlock: (s: RewardStats) => s.streak >= 7 },
] as const;
export type RewardStats = { tasks: number; focusHours: number; streak: number; loginDays: number; referrals: number };
export function avatarFor(key?: string | null) { return AVATARS.find((a) => a.key === key) ?? AVATARS[0]; }
