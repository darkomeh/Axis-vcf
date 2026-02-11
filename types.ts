export interface User {
  id: string;
  name: string;
  phone: string;
  timestamp: number;
  isOverflow: boolean;
}

export interface GroupLink {
  id: string;
  url: string;
  name: string;
  emoji: string;
  isActive: boolean;
}

export interface AppSettings {
  targetCount: number;
  totalCollected: number;
  isCountdownActive: boolean;
  countdownStartTime: number | null; // Timestamp when 800 was hit
  isSystemLocked: boolean; // True when countdown finishes or admin manual lock
  adminPasswordHash: string; // Stored simply for demo
}

export const CONSTANTS = {
  TARGET_USERS: 800,
  COUNTDOWN_DURATION_MS: 12 * 60 * 60 * 1000, // 12 hours
  DEFAULT_GROUP_URL: 'https://chat.whatsapp.com/GtVgGTFN8t52sAHaR4XAwq?mode=gi_c',
};

// --------------------------------------------------------
// ⚠️ CLOUD DATABASE CONFIGURATION (REQUIRED FOR SYNC)
// --------------------------------------------------------
// 1. Go to https://supabase.com and create a free project.
// 2. Paste your URL and ANON KEY below.
// 3. Run the SQL script provided in the documentation.
// --------------------------------------------------------
export const SUPABASE_CONFIG = {
  URL: 'https://nwcbsnfmrfpwhoschqlh.supabase.co',
  KEY: 'sb_publishable_Lpp3QMmEsRNKUI9nOsjIYg_RXsYOweG'
};