export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  isFrozen: boolean;
  createdAt: string;
}

export interface Secret {
  id: string;
  title: string;
  type: 'password' | 'note' | 'card' | 'identity';
  url?: string;
  username?: string;
  encryptedData: string;
  notes?: string;
  isFavorite: boolean;
  isHoneypot?: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  requireMfa?: boolean;
}

export interface CreateSecretRequest {
  title: string;
  type: 'password' | 'note' | 'card' | 'identity';
  url?: string;
  username?: string;
  encryptedData: string;
  notes?: string;
}

export interface ShareSecretRequest {
  sharedWithEmail: string;
  permission: 'read' | 'write';
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
}