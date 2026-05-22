import api from "./api";
import type { LoginRequest, RegisterRequest, AuthResponse } from "../types";

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
    localStorage.removeItem("accessToken");
  },

  async getProfile() {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  async enableMfa() {
    const response = await api.post("/auth/mfa/enable");
    return response.data; // { qrCode, secret }
  },

  async verifyMfa(token: string) {
    const response = await api.post("/auth/mfa/verify", { token });
    return response.data;
  },

  async disableMfa(token: string) {
    const response = await api.post("/auth/mfa/disable", { token });
    return response.data;
  },
};
