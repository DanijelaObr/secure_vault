import api from "./api";
import type { SecurityPolicy, AuditLog } from "../types";

export const adminService = {
  async getSecurityPolicy(): Promise<SecurityPolicy> {
    const response = await api.get("/admin/security-policy");
    return response.data;
  },

  async updateSecurityPolicy(
    data: Partial<SecurityPolicy>,
  ): Promise<SecurityPolicy> {
    const response = await api.put("/admin/security-policy", data);
    return response.data;
  },

  async getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const response = await api.get(`/vault/audit/recent?limit=${limit}`);
    return response.data;
  },

  /** Provjera integriteta hash-lanca audit logova. */
  async verifyAuditIntegrity(): Promise<{
    isValid: boolean;
    brokenAt?: string;
  }> {
    const response = await api.get("/vault/audit/verify");
    return response.data;
  },

  async getMyActivity(): Promise<AuditLog[]> {
    const response = await api.get("/vault/audit/my-activity");
    return response.data;
  },

  /** Kreiranje honeypot tajne (nevidljiva regularnim korisnicima). */
  async createHoneypot(payload: {
    title: string;
    encryptedData: string;
    encryptedKey: string;
    type: string;
  }): Promise<any> {
    const response = await api.post("/vault/honeypot", payload);
    return response.data;
  },

  /** Test SQL injection endpointa (radi samo ako je uključen u policy). */
  async testSqlInjection(email: string): Promise<any> {
    const response = await api.post("/vault/test/sql-injection", { email });
    return response.data;
  },
};
