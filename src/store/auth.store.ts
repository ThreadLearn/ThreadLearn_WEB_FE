'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthTokens, AuthUser, UserStats } from '../types';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_STORE_KEY = 'threadlearn-auth';
const AUTH_STORAGE_MODE_KEY = 'threadlearn-auth-storage';

export type AuthStorageMode = 'local' | 'session';

type StoredAuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const canUseStorage = () => typeof window !== 'undefined';

const getAuthStorageMode = (): AuthStorageMode => {
  if (!canUseStorage()) return 'local';

  if (localStorage.getItem(AUTH_STORAGE_MODE_KEY) === 'local') return 'local';
  if (sessionStorage.getItem(AUTH_STORAGE_MODE_KEY) === 'session') return 'session';

  if (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem(AUTH_STORE_KEY)
  ) {
    return 'local';
  }

  if (
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(AUTH_STORE_KEY)
  ) {
    return 'session';
  }

  return 'local';
};

const getAuthStorage = (mode: AuthStorageMode = getAuthStorageMode()) =>
  mode === 'local' ? localStorage : sessionStorage;

const clearAuthStorageFrom = (storage: Storage) => {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(AUTH_STORE_KEY);
  storage.removeItem(AUTH_STORAGE_MODE_KEY);
};

const setAuthStorageMode = (mode: AuthStorageMode) => {
  if (!canUseStorage()) return;

  const targetStorage = getAuthStorage(mode);
  const inactiveStorage = mode === 'local' ? sessionStorage : localStorage;
  clearAuthStorageFrom(inactiveStorage);
  targetStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
};

export const getStoredAuthTokens = (): StoredAuthTokens => {
  if (!canUseStorage()) {
    return { accessToken: null, refreshToken: null };
  }

  const localAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const localRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (localAccessToken || localRefreshToken) {
    return {
      accessToken: localAccessToken,
      refreshToken: localRefreshToken,
    };
  }

  return {
    accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY),
  };
};

export const persistAuthTokens = (
  tokens: Partial<AuthTokens>,
  mode?: AuthStorageMode
) => {
  if (!canUseStorage()) return;

  if (mode) setAuthStorageMode(mode);
  const storage = getAuthStorage(mode);

  if (tokens.accessToken) {
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  if (tokens.refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
};

export const clearAuthStorage = () => {
  if (!canUseStorage()) return;

  clearAuthStorageFrom(localStorage);
  clearAuthStorageFrom(sessionStorage);
};

const authPersistStorage = {
  getItem: (name: string) => {
    if (!canUseStorage()) return null;
    return localStorage.getItem(name) ?? sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (!canUseStorage()) return;
    getAuthStorage().setItem(name, value);
  },
  removeItem: (name: string) => {
    if (!canUseStorage()) return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const sanitizeAuthUser = (user: AuthUser): AuthUser => {
  const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const sanitized: AuthUser = {
    _id: user._id || user.id || '',
    id: user.id || user._id,
    email: user.email,
    name: user.name || fallbackName || user.email,
    role: user.role,
    planType: user.planType,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.firstName !== undefined) sanitized.firstName = user.firstName;
  if (user.lastName !== undefined) sanitized.lastName = user.lastName;
  if (user.avatarUrl !== undefined) sanitized.avatarUrl = user.avatarUrl;
  if (user.subscriptionExpiresAt !== undefined) {
    sanitized.subscriptionExpiresAt = user.subscriptionExpiresAt;
  }
  if (user.isLocked !== undefined) sanitized.isLocked = user.isLocked;
  if (user.isEmailVerified !== undefined) {
    sanitized.isEmailVerified = user.isEmailVerified;
  }
  if (user.isVerified !== undefined) sanitized.isVerified = user.isVerified;
  if (user.isActive !== undefined) sanitized.isActive = user.isActive;
  if (user.lastLoginAt !== undefined) sanitized.lastLoginAt = user.lastLoginAt;

  return sanitized;
};

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  stats: UserStats | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
    storageMode?: AuthStorageMode
  ) => void;
  setUser: (user: AuthUser) => void;
  setStats: (stats: UserStats) => void;
  updateAccessToken: (token: string) => void;
  updateTokens: (tokens: Partial<AuthTokens>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      stats: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken, storageMode = 'local') => {
        persistAuthTokens({ accessToken, refreshToken }, storageMode);
        set({
          user: sanitizeAuthUser(user),
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user: sanitizeAuthUser(user) }),

      setStats: (stats) => set({ stats }),

      updateAccessToken: (token) => {
        persistAuthTokens({ accessToken: token });
        set({ accessToken: token });
      },

      updateTokens: (tokens) => {
        persistAuthTokens(tokens);
        set((state) => ({
          accessToken: tokens.accessToken ?? state.accessToken,
          refreshToken: tokens.refreshToken ?? state.refreshToken,
        }));
      },

      logout: () => {
        clearAuthStorage();
        set({ user: null, accessToken: null, refreshToken: null, stats: null, isAuthenticated: false });
      },
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => authPersistStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
