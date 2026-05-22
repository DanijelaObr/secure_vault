import api from "./api";
import type { Secret, CreateSecretRequest, ShareSecretRequest } from "../types";

export const vaultService = {
  async getAllSecrets(): Promise<Secret[]> {
    const response = await api.get("/vault/secrets");
    return response.data;
  },

  async getSecretById(id: string): Promise<Secret> {
    const response = await api.get(`/vault/secrets/${id}`);
    return response.data;
  },

  async createSecret(data: CreateSecretRequest): Promise<Secret> {
    const response = await api.post("/vault/secrets", data);
    return response.data;
  },

  async updateSecret(
    id: string,
    data: Partial<CreateSecretRequest>,
  ): Promise<Secret> {
    const response = await api.put(`/vault/secrets/${id}`, data);
    return response.data;
  },

  async deleteSecret(id: string): Promise<void> {
    await api.delete(`/vault/secrets/${id}`);
  },

  async getFavoriteSecrets(): Promise<Secret[]> {
    const response = await api.get("/vault/secrets/favorites");
    return response.data;
  },

  async shareSecret(secretId: string, data: ShareSecretRequest): Promise<void> {
    await api.post(`/vault/secrets/${secretId}/share`, data);
  },

  async getSharedWithMe(): Promise<Secret[]> {
    const response = await api.get("/vault/shared-with-me");
    return response.data;
  },

  async revokeShare(secretId: string, email: string): Promise<void> {
    await api.delete(`/vault/secrets/${secretId}/share/${email}`);
  },

  // Admin only
  async createHoneypot(data: CreateSecretRequest): Promise<Secret> {
    const response = await api.post("/vault/honeypot", data);
    return response.data;
  },
};
