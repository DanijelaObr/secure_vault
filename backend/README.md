# Secure Vault - Backend Setup

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

---

## Getting Started

### Option 1: With Docker Compose (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start all services (PostgreSQL + Redis + Backend)
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Initialize database
curl -X POST http://localhost:3000/setup-database
```

**Backend:** `http://localhost:3000`

**PostgreSQL:** `localhost:5433`

**Redis:** `localhost:63790`

---

### Option 2: Local Development (without Docker)

```bash
# Start only database and Redis
docker-compose up -d postgres redis

# Install dependencies
npm install

# Start development server
npm run start:dev

# Backend will be available at http://localhost:3000
```

---

## Testing Endpoints

### User Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "username": "Admin User",
    "password": "StrongPass123!",
    "role": "admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "StrongPass123!"
  }'
```

### Enable MFA

```bash
curl -X POST http://localhost:3000/auth/mfa/enable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### SQL Injection Test (Honeypot)

```bash
curl -X POST http://localhost:3000/vault/test/sql-injection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"email": "test@test.com OR 1=1"}'
```

---

## Project Structure

```
backend/
├── src/
│   ├── admin/              # Admin functionality and security policies
│   ├── auth/               # Authentication (JWT, MFA, Google OAuth)
│   ├── vault/              # Secret management (CRUD, sharing)
│   ├── shared/
│   │   ├── services/
│   │   │   ├── audit.service.ts      # Immutable audit log
│   │   │   ├── crypto.service.ts     # Cryptography (RSA, AES)
│   │   │   ├── email.service.ts      # Email notifications
│   │   │   └── security.service.ts   # IP ban, suspicious activity
│   │   └── enums/
│   └── database/
│       └── entities/       # TypeORM entities
├── docker-compose.yml
├── Dockerfile
├── .env
└── package.json
```

---

## Key Features

### Implemented Functionality

- **Zero-Knowledge Vault** - Server never sees decrypted secrets
- **MFA (TOTP)** - Google Authenticator compatible
- **OIDC (Google OAuth)** - Login via Google account
- **Secure Sharing** - Asymmetric cryptography (RSA)
- **Rate Limiting** - Redis-based throttling
- **IP Banning** - Automatic ban after suspicious activities
- **Honeypot System** - Fake secrets for intrusion detection
- **Immutable Audit Log** - Blockchain-style hash chain
- **SQL Injection Test Endpoint** - For honeypot demonstration
- **Session Rotation** - Access & Refresh token rotation
- **Security Policies** - Configurable password policies, session duration

---

## Useful Commands

```bash
# Rebuild backend container
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING - deletes database!)
docker-compose down -v

# Check container status
docker-compose ps

# Access PostgreSQL
docker exec -it secure-vault-postgres psql -U postgres -d secure_vault

# Access Redis CLI
docker exec -it secure-vault-redis redis-cli

# View backend logs in real-time
docker-compose logs -f backend
```

---

## Email Testing

All emails can be viewed on **Mailtrap inbox** :

- URL: https://mailtrap.io/inboxes
- Login with credentials from .env

**Email types:**

- Honeypot trigger (admin alert)
- Account frozen notification
- MFA setup

---

## Security Notes

### Development (.env current configuration)

Safe for local testing

### Production

**MUST CHANGE:**

- `JWT_SECRET` - Generate new: `openssl rand -base64 64`
- `DB_PASSWORD` - Use strong password
- `GOOGLE_CLIENT_SECRET` - Create new OAuth application
- `SMTP_*` - Use real SMTP server (not Mailtrap)

---

## Debugging

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready -> Wait 10-15s, health check will resolve
# - Port already in use -> Change in docker-compose.yml
```

### Cannot connect to database

```bash
# Check if PostgreSQL is ready
docker exec secure-vault-postgres pg_isready -U postgres

# If not, restart
docker-compose restart postgres
```

### Rate limit error

```bash
# Clear Redis
docker exec secure-vault-redis redis-cli FLUSHALL
```

---

## API Documentation

**Auth Endpoints:**

- `POST /auth/register` - User registration
- `POST /auth/login` - Login (returns access + refresh token)
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `POST /auth/mfa/enable` - Enable MFA
- `POST /auth/mfa/verify` - Verify MFA code
- `POST /auth/mfa/disable` - Disable MFA
- `GET /auth/google` - Google OAuth redirect
- `GET /auth/google/callback` - Google OAuth callback

**Vault Endpoints:**

- `POST /vault/secrets` - Create secret
- `GET /vault/secrets` - Get all secrets
- `GET /vault/secrets/:id` - Get single secret
- `PATCH /vault/secrets/:id` - Update secret
- `DELETE /vault/secrets/:id` - Delete secret
- `POST /vault/secrets/:id/share` - Share secret
- `POST /vault/honeypot` - Create honeypot (admin only)
- `POST /vault/test/sql-injection` - SQL Injection test

**Admin Endpoints:**

- `GET /admin/security-policy` - Get security policy
- `PATCH /admin/security-policy` - Update policy
- `GET /admin/audit-logs` - Get audit logs
- `GET /admin/audit-logs/verify` - Verify log integrity

---

## Support

For questions about this project:

- GitHub Issues
- Email: admin@securevault.com

---

**Version:** 1.0.0

**Author:** Danijela Obradovic
