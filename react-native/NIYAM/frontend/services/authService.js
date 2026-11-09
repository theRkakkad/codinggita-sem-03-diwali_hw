import api from './api';
import { authStorage } from './authStorage';

/**
 * Authentication Service for NIYAM.
 * Handles registration, login, profile retrieval, and secure session persistence.
 */
export const authService = {
  /**
   * Register a new user account
   * POST /api/auth/register
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ user: object, token: string }>}
   */
  async register({ name, email, password }) {
    const cleanEmail = email?.trim()?.toLowerCase();
    const response = await api.post('/api/auth/register', {
      name: name?.trim(),
      email: cleanEmail,
      password,
    });

    let { user, token } = response.data;

    // If backend register endpoint does not directly return token, auto-login to acquire JWT session
    if (!token) {
      const loginResult = await this.login({ email: cleanEmail, password });
      user = loginResult.user;
      token = loginResult.token;
    } else {
      await authStorage.setToken(token);
      await authStorage.setUser(user);
    }

    return { user, token };
  },

  /**
   * Authenticate an existing user
   * POST /api/auth/login
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ user: object, token: string }>}
   */
  async login({ email, password }) {
    const response = await api.post('/api/auth/login', {
      email: email?.trim()?.toLowerCase(),
      password,
    });

    const { user, token } = response.data;
    if (token) {
      await authStorage.setToken(token);
      await authStorage.setUser(user);
    }

    return { user, token };
  },

  /**
   * Fetch current authenticated user profile
   * GET /api/auth/me
   * @returns {Promise<object>}
   */
  async getMe() {
    const response = await api.get('/api/auth/me');
    const { user } = response.data;
    if (user) {
      await authStorage.setUser(user);
    }
    return user;
  },

  /**
   * Update authenticated user profile (name, avatar)
   * PUT /api/auth/profile
   * @param {object} updates
   * @param {string} [updates.name]
   * @param {string|null} [updates.avatar]
   * @returns {Promise<object>}
   */
  async updateProfile(updates) {
    const response = await api.put('/api/auth/profile', updates);
    const { user } = response.data;
    if (user) {
      await authStorage.setUser(user);
    }
    return user;
  },

  /**
   * Terminate active session and purge secure credentials
   * @returns {Promise<void>}
   */
  async logout() {
    await authStorage.removeToken();
  },
};

export default authService;
