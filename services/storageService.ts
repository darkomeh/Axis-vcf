import { User, AppSettings, GroupLink, CONSTANTS, SUPABASE_CONFIG } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const KEYS = {
  USERS: 'axis_users',
  SETTINGS: 'axis_settings',
  GROUPS: 'axis_groups',
};

// Broadcast channel for Cross-Tab Sync (Local Only)
const channel = new BroadcastChannel('axis_sync_channel');

let supabase: SupabaseClient | null = null;

export const StorageService = {
  init: () => {
    // Initialize Supabase if keys are present
    if (SUPABASE_CONFIG.URL && SUPABASE_CONFIG.KEY) {
      try {
        supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
        console.log("Λ𝗫𝗜𝗦: Cloud Uplink Established.");
      } catch (e) {
        console.error("Λ𝗫𝗜𝗦: Cloud Connection Failed", e);
      }
    } else {
        console.warn("Λ𝗫𝗜𝗦: Running in OFFLINE MODE. Data will not sync across devices.");
    }

    // Initialize Local Storage Fallback
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      const initialSettings: AppSettings = {
        targetCount: CONSTANTS.TARGET_USERS,
        totalCollected: 0,
        isCountdownActive: false,
        countdownStartTime: null,
        isSystemLocked: false,
        adminPasswordHash: '1',
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initialSettings));
    }
    if (!localStorage.getItem(KEYS.GROUPS)) {
      const defaultGroup: GroupLink = {
        id: '1',
        name: 'Main WhatsApp Group',
        url: CONSTANTS.DEFAULT_GROUP_URL,
        emoji: '🚀',
        isActive: true,
      };
      localStorage.setItem(KEYS.GROUPS, JSON.stringify([defaultGroup]));
    }
  },

  isCloudEnabled: () => !!supabase,

  // Async wrapper to support future database calls
  getUsers: async (): Promise<User[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('axis_users').select('*').order('timestamp', { ascending: true });
        if (!error && data) return data.map(d => ({ ...d, isOverflow: d.is_overflow })); 
    }
    // Fallback to local
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  getSettings: async (): Promise<AppSettings> => {
    const defaultSettings: AppSettings = {
        targetCount: CONSTANTS.TARGET_USERS,
        totalCollected: 0,
        isCountdownActive: false,
        countdownStartTime: null,
        isSystemLocked: false,
        adminPasswordHash: '1',
    };

    if (supabase) {
        // Try to fetch settings. If table is empty, this might return null.
        const { data } = await supabase.from('axis_settings').select('*').single();
        if (data) {
            return {
                targetCount: data.target_count,
                totalCollected: data.total_collected,
                isCountdownActive: data.is_countdown_active,
                countdownStartTime: data.countdown_start_time,
                isSystemLocked: data.is_system_locked,
                adminPasswordHash: defaultSettings.adminPasswordHash // Secrets usually kept local or in secure auth
            };
        }
    }

    try {
      const item = localStorage.getItem(KEYS.SETTINGS);
      if (!item) return defaultSettings;
      const parsed = JSON.parse(item);
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  },

  getGroups: async (): Promise<GroupLink[]> => {
    if (supabase) {
        const { data } = await supabase.from('axis_groups').select('*');
        if (data && data.length > 0) return data.map(d => ({...d, isActive: d.is_active}));
    }
    try {
      return JSON.parse(localStorage.getItem(KEYS.GROUPS) || '[]');
    } catch {
      return [];
    }
  },

  getActiveGroup: async (): Promise<GroupLink | undefined> => {
    const groups = await StorageService.getGroups();
    return groups.find(g => g.isActive) || groups[0];
  },

  updateSettings: async (newSettings: Partial<AppSettings>) => {
    // Update Local
    const currentLocal = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    const updatedLocal = { ...currentLocal, ...newSettings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updatedLocal));
    
    // Notify other tabs
    channel.postMessage({ type: 'SETTINGS_UPDATE' });

    // Update Cloud
    if (supabase) {
        const payload: any = {};
        if (newSettings.targetCount !== undefined) payload.target_count = newSettings.targetCount;
        if (newSettings.totalCollected !== undefined) payload.total_collected = newSettings.totalCollected;
        if (newSettings.isCountdownActive !== undefined) payload.is_countdown_active = newSettings.isCountdownActive;
        if (newSettings.countdownStartTime !== undefined) payload.countdown_start_time = newSettings.countdownStartTime;
        if (newSettings.isSystemLocked !== undefined) payload.is_system_locked = newSettings.isSystemLocked;

        // Use upsert to create the row if it doesn't exist (robustness against missing init SQL)
        await supabase.from('axis_settings').upsert({
            id: 1,
            ...payload
        });
    }

    return updatedLocal;
  },

  updateGroups: async (groups: GroupLink[]) => {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
    channel.postMessage({ type: 'GROUPS_UPDATE' });

    if (supabase) {
        // Simple strategy: upsert all. In production, be more selective.
        for (const g of groups) {
            await supabase.from('axis_groups').upsert({
                id: g.id,
                name: g.name,
                url: g.url,
                emoji: g.emoji,
                is_active: g.isActive
            });
        }
    }
  },

  addUser: async (name: string, phone: string): Promise<{ success: boolean; message: string; user?: User }> => {
    const settings = await StorageService.getSettings();
    
    if (settings.isSystemLocked) {
      return { success: false, message: 'Submissions are currently locked.' };
    }

    // 1. Check Duplicates (Cloud or Local)
    let users: User[] = [];
    if (supabase) {
        const { data } = await supabase.from('axis_users').select('phone');
        if (data) users = data as any;
    } else {
        users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    if (users.some(u => u.phone.replace(/\D/g, '') === normalizedPhone)) {
      return { success: false, message: 'This number has already been registered.' };
    }

    const totalCount = users.length;
    const isOverflow = totalCount >= settings.targetCount;

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      phone,
      timestamp: Date.now(),
      isOverflow,
    };

    // 2. Save
    if (supabase) {
        const { error } = await supabase.from('axis_users').insert({
            id: newUser.id,
            name: newUser.name,
            phone: newUser.phone,
            timestamp: newUser.timestamp,
            is_overflow: newUser.isOverflow
        });
        if (error) return { success: false, message: 'Cloud Error: ' + error.message };
        
        // ROBUST SYNC FIX: 
        // Get the EXACT count from the database to ensure A and B see the same total.
        // This avoids race conditions and doesn't rely on the RPC function being present.
        const { count } = await supabase.from('axis_users').select('*', { count: 'exact', head: true });
        
        if (count !== null) {
            // Force update the global settings with the true count
            await StorageService.updateSettings({ totalCollected: count });
        }

    } else {
        const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
        const updatedUsers = [...currentUsers, newUser];
        localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
        
        await StorageService.updateSettings({ totalCollected: updatedUsers.length });
        channel.postMessage({ type: 'USER_ADDED' });
    }

    // 3. Trigger Logic
    const newTotal = (supabase ? (users.length + 1) : (users.length + 1)); // Approximation for immediate UI feedback
    if (newTotal >= settings.targetCount && !settings.isCountdownActive && !settings.countdownStartTime) {
      await StorageService.updateSettings({
          isCountdownActive: true,
          countdownStartTime: Date.now()
      });
    }

    return { success: true, message: 'Joined successfully!', user: newUser };
  },

  checkCountdownStatus: async () => {
    const settings = await StorageService.getSettings();
    if (settings.isCountdownActive && settings.countdownStartTime) {
      const now = Date.now();
      const elapsed = now - settings.countdownStartTime;
      if (elapsed > CONSTANTS.COUNTDOWN_DURATION_MS) {
        await StorageService.updateSettings({
          isCountdownActive: false,
          isSystemLocked: true
        });
      }
    }
  },

  resetCampaign: async () => {
    // 1. Clear Users
    if (supabase) {
        await supabase.from('axis_users').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify([]));

    // 2. Reset Settings
    const currentSettings = await StorageService.getSettings();
    const newSettings = {
        totalCollected: 0,
        isCountdownActive: false,
        countdownStartTime: null,
        isSystemLocked: false,
    };
    await StorageService.updateSettings(newSettings);
    
    channel.postMessage({ type: 'RESET' });
  }
};