import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Unified storage API — localStorage on web, AsyncStorage on native.
export const storage = {
  async get(key) {
    try {
      if (Platform.OS === 'web') {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async set(key, value) {
    const str = JSON.stringify(value);
    if (Platform.OS === 'web') {
      localStorage.setItem(key, str);
    } else {
      await AsyncStorage.setItem(key, str);
    }
  },

  async remove(key) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },

  // Retrieve all settings as a flat object
  async getAllSettings() {
    const keys = [
      'aria_name',
      'aria_personality',
      'aria_avatar',
      'aria_theme',
      'groq_api_key',
      'clockify_api_key',
      'work_github_token',
      'work_github_owner',
      'work_github_repo',
      'work_hours_goal',
      'personal_github_token',
      'personal_github_owner',
      'personal_github_repo',
      'integrations_clockify',
      'integrations_todos',
      'integrations_notes',
      'active_tab',
    ];
    const result = {};
    for (const key of keys) {
      result[key] = await storage.get(key);
    }
    return result;
  },

  // Check if the minimum required settings are configured
  async isConfigured() {
    const groq = await storage.get('groq_api_key');
    return !!groq;
  },
};
