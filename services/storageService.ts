import { User, AppSettings, GroupLink, CONSTANTS } from '../types';

const KEYS = {
  USERS: 'axis_users',
  SETTINGS: 'axis_settings',
  GROUPS: 'axis_groups',
};

export const StorageService = {
  init: () => {
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
        adminPasswordHash: '1', // In a real app, this would be env var and hashed properly
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

  getUsers: (): User[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  getSettings: (): AppSettings => {
    const defaultSettings: AppSettings = {
        targetCount: CONSTANTS.TARGET_USERS,
        totalCollected: 0,
        isCountdownActive: false,
        countdownStartTime: null,
        isSystemLocked: false,
        adminPasswordHash: '1',
    };

    try {
      const item = localStorage.getItem(KEYS.SETTINGS);
      if (!item) return defaultSettings;
      
      const parsed = JSON.parse(item);
      // Merge with default settings to ensure all required fields exist
      // This prevents crashes if the structure changes or if 'item' was '{}'
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  },

  getGroups: (): GroupLink[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.GROUPS) || '[]');
    } catch {
      return [];
    }
  },

  getActiveGroup: (): GroupLink | undefined => {
    const groups = StorageService.getGroups();
    return groups.find(g => g.isActive) || groups[0];
  },

  updateSettings: (newSettings: Partial<AppSettings>) => {
    const current = StorageService.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  updateGroups: (groups: GroupLink[]) => {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
  },

  addUser: (name: string, phone: string): { success: boolean; message: string; user?: User } => {
    const settings = StorageService.getSettings();
    
    if (settings.isSystemLocked) {
      return { success: false, message: 'Submissions are currently locked.' };
    }

    const users = StorageService.getUsers();

    // Duplicate check
    const normalizedPhone = phone.replace(/\D/g, '');
    if (users.some(u => u.phone.replace(/\D/g, '') === normalizedPhone)) {
      return { success: false, message: 'This number has already been registered.' };
    }

    // Determine overflow status
    const isOverflow = users.length >= settings.targetCount;

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      phone,
      timestamp: Date.now(),
      isOverflow,
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));

    // Update settings (count and triggers)
    const updates: Partial<AppSettings> = {
      totalCollected: updatedUsers.length
    };

    // Trigger logic
    if (updatedUsers.length >= settings.targetCount && !settings.isCountdownActive && !settings.countdownStartTime) {
      updates.isCountdownActive = true;
      updates.countdownStartTime = Date.now();
    }

    StorageService.updateSettings(updates);

    return { success: true, message: 'Joined successfully!', user: newUser };
  },

  checkCountdownStatus: () => {
    const settings = StorageService.getSettings();
    if (settings.isCountdownActive && settings.countdownStartTime) {
      const now = Date.now();
      const elapsed = now - settings.countdownStartTime;
      if (elapsed > CONSTANTS.COUNTDOWN_DURATION_MS) {
        // Time is up, lock system
        StorageService.updateSettings({
          isCountdownActive: false,
          isSystemLocked: true
        });
      }
    }
  },

  resetSystem: () => {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.SETTINGS);
    StorageService.init();
  }
};