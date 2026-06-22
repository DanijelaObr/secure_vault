import api from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CryptoMaterial,
} from "../types";

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async register(
    data: RegisterRequest,
  ): Promise<{ message: string; userId: string }> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async getProfile() {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  // ===== ZERO-KNOWLEDGE =====

  /** Kripto materijal trenutnog korisnika (salt, wrapped private key, public key). */
  async getCryptoMaterial(): Promise<CryptoMaterial> {
    const response = await api.get("/auth/crypto-material");
    return response.data;
  },

  /** Javni ključ drugog korisnika (za dijeljenje). */
  async getPublicKey(
    email: string,
  ): Promise<{ email: string; publicKey: string }> {
    const response = await api.get(
      `/auth/public-key/${encodeURIComponent(email)}`,
    );
    return response.data;
  },

  /** Inicijalizacija vault ključeva (npr. Google nalog bez master passworda). */
  async setupVault(payload: {
    publicKey: string;
    encryptedPrivateKey: string;
    salt: string;
  }): Promise<{ message: string }> {
    const response = await api.post("/auth/setup-vault", payload);
    return response.data;
  },

  // ===== MFA =====

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
