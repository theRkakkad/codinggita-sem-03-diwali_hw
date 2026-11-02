import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'niyam_auth_token';
const USER_KEY = 'niyam_auth_user';

/**
 * Safe wrapper around Expo SecureStore for encrypted token persistence on native devices,
 * with standard browser storage fallback for web environments.
 */
export const authStorage = {
  /**
   * Retrieve stored JWT token
   * @returns {Promise<string|null>}
   */
  async getToken() {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(TOKEN_KEY);
        }
        return null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('SecureStore error reading token:', error);
      return null;
    }
  },

  /**
   * Save JWT token to secure hardware storage
   * @param {string} token
   * @returns {Promise<void>}
   */
  async setToken(token) {
    try {
      if (!token) return;
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, token);
        }
        return;
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.warn('SecureStore error saving token:', error);
    }
  },

  /**
   * Clear JWT token from storage
   * @returns {Promise<void>}
   */
  async removeToken() {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('SecureStore error removing token:', error);
    }
  },

  /**
   * Retrieve cached user profile
   * @returns {Promise<object|null>}
   */
  async getUser() {
    try {
      let raw;
      if (Platform.OS === 'web') {
        raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Save cached user profile
   * @param {object} user
   * @returns {Promise<void>}
   */
  async setUser(user) {
    try {
      if (!user) return;
      const raw = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(USER_KEY, raw);
        }
        return;
      }
      await SecureStore.setItemAsync(USER_KEY, raw);
    } catch (error) {
      console.warn('SecureStore error saving user:', error);
    }
  },
};

export default authStorage;
