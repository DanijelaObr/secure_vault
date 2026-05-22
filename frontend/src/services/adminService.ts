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

  async verifyAuditLog(logId: string): Promise<{ valid: boolean }> {
    const response = await api.get(`/vault/audit/verify?logId=${logId}`);
    return response.data;
  },

  async getMyActivity(): Promise<AuditLog[]> {
    const response = await api.get("/vault/audit/my-activity");
    return response.data;
  },
};
