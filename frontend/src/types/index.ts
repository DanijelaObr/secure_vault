export interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "team_lead" | "developer";
  mfaEnabled?: boolean;
  isFrozen?: boolean;
  createdAt?: string;
  // ZK kripto materijal (vraća se pri loginu)
  salt?: string | null;
  encryptedPrivateKey?: string;
  publicKey?: string;
  vaultInitialized?: boolean;
}

export interface Secret {
  id: string;
  title: string;
  type: "password" | "note" | "card" | "identity";
  url?: string;
  username?: string;
  encryptedData: string; // AES-GCM blob (JSON { iv, data })
  encryptedKey?: string; // RSA-šifrovan AES ključ (za vlasnika ili za mene kod deljenja)
  isFavorite: boolean;
  isHoneypot?: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  owner?: { email: string; username: string };
  permission?: "read" | "write";
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  role: "admin" | "team_lead" | "developer";
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
}

export interface AuthResponse {
  user: User;
  requiresMfa?: boolean;
}

export interface CreateSecretRequest {
  title: string;
  type: "password" | "note" | "card" | "identity";
  url?: string;
  username?: string;
  encryptedData: string;
  encryptedKey: string;
  isFavorite?: boolean;
}

export interface ShareSecretRequest {
  sharedWithEmail: string;
  encryptedKey: string;
  permission?: "read" | "write";
}

export interface CryptoMaterial {
  salt: string | null;
  encryptedPrivateKey: string;
  publicKey: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  secretId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SecurityPolicy {
  id: string;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  accessTokenDuration: number;
  refreshTokenDuration: number;
  sessionTimeout: number;
  secretRotationPeriod: number;
  enforceSecretRotation: boolean;
  maxLoginAttempts: number;
  accountLockoutDuration: number;
  requireMfaForAdmins: boolean;
  sqlInjectionTestEnabled: boolean;
}
