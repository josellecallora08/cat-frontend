import { create } from "zustand";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type UserRole = "admin" | "agent";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid email or password");
      }

      const data = await res.json();
      const { access_token, user } = data;

      localStorage.setItem("cat_token", access_token);
      localStorage.setItem("cat_user", JSON.stringify(user));

      set({ user, token: access_token, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ isLoading: false, error: message });
    }
  },

  register: async (email: string, password: string, fullName: string, role: UserRole) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Registration failed");
      }

      const data = await res.json();
      const { access_token, user } = data;

      localStorage.setItem("cat_token", access_token);
      localStorage.setItem("cat_user", JSON.stringify(user));

      set({ user, token: access_token, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      set({ isLoading: false, error: message });
    }
  },

  logout: () => {
    localStorage.removeItem("cat_token");
    localStorage.removeItem("cat_user");
    set(initialState);
  },

  hydrate: () => {
    const token = localStorage.getItem("cat_token");
    const userStr = localStorage.getItem("cat_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        set({ user, token });
      } catch {
        localStorage.removeItem("cat_token");
        localStorage.removeItem("cat_user");
      }
    }
  },
}));
