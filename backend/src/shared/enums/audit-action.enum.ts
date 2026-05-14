export enum AuditAction {
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  SECRET_CREATE = 'secret_create',
  SECRET_READ = 'secret_read',
  SECRET_UPDATE = 'secret_update',
  SECRET_DELETE = 'secret_delete',
  SECRET_SHARE = 'secret_share',
  SECRET_REVOKE_SHARE = 'secret_revoke_share',
  HONEYPOT_TRIGGERED = 'honeypot_triggered',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
}
