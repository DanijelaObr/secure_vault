import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types";
import api from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Učitaj korisnika pri mount-u
  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const response = await api.get("/auth/profile");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log("1. Login function called with:", email);

    try {
      const response = await api.post("/auth/login", { email, password });
      console.log("2. Full response:", response);
      console.log("3. Response data:", response.data);

      if (response.data.requiresMfa) {
        console.log("4. MFA required");
        return { requireMfa: true };
      }

      console.log("5. Extracting tokens...");
      const { access_token, user } = response.data;
      console.log("6. Access token:", access_token);
      console.log("7. User:", user);

      console.log("8. Saving to localStorage...");
      localStorage.setItem("accessToken", access_token);
      console.log("9. Token saved:", localStorage.getItem("accessToken"));

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(user);

      console.log("10. Login complete!");
      return { success: true, user };
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
  ) => {
    const response = await api.post("/auth/register", {
      email,
      username,
      password,
    });
    const { access_token, user } = response.data;

    localStorage.setItem("accessToken", access_token);
    setUser(user);

    return { success: true };
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
