# Security Documentation

This document describes the security measures implemented in this application.

## 🔒 Security Features

### 1. Authentication & Authorization

#### JWT-Based Authentication
- **Implementation**: `lib/services/auth.ts`
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Token Expiry**: 8 hours
- **Storage**: HttpOnly cookies with `__Host-` prefix

#### OAuth 2.0 Integration
- **Provider**: Google OAuth
- **Domain Restriction**: Only allows emails from configured domain
- **CSRF Protection**: State parameter validation
- **Implementation**: `lib/services/google-oauth.ts`

#### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Minimum Requirements**: Enforced by validation schemas
- **Account Lockout**: 5 failed attempts = 15 minute lockout

### 2. Rate Limiting

**Implementation**: `lib/middleware/rateLimit.ts`

#### Presets:
- **Authentication endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per minute
- **Expensive operations**: 10 requests per minute

**Protected Endpoints**:
- `/api/auth/login-password` - Prevents brute force attacks

### 3. Input Validation

**Implementation**: `lib/validation/schemas.ts`

All API inputs are validated using Zod schemas:
- Type checking
- Length limits
- Format validation (email, dates, etc.)
- Prevents injection attacks

**Example**:
```typescript
import { validateRequest, loginPasswordSchema } from '@/lib/validation/schemas'

const { email, password } = validateRequest(loginPasswordSchema, body)
```

### 4. SQL Injection Prevention

**Implementation**: `lib/services/deepDiveQueryBuilder.ts`, `lib/services/analyticsQueries.ts`

- All user inputs are escaped using `escapeSqlValue()` function
- Single quotes are doubled for SQL escaping
- Type validation (string vs number)
- Parameterized queries where possible

### 5. CSRF Protection

**Implementation**: `lib/middleware/csrf.ts`

- **Method**: Double-submit cookie pattern
- **Token Generation**: 32-byte random hex
- **Validation**: Constant-time comparison to prevent timing attacks
- **Scope**: All state-changing requests (POST, PUT, DELETE, PATCH)

**How to Use**:
```typescript
// Frontend: Get CSRF token
const response = await fetch('/api/auth/csrf')
const { csrfToken } = await response.json()

// Include in requests
fetch('/api/filter-presets', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify(data)
})
```

### 6. Cookie Security

All authentication cookies use enhanced security settings:

```typescript
{
  httpOnly: true,           // Cannot be accessed by JavaScript
  secure: true,             // Only sent over HTTPS
  sameSite: 'strict',       // CSRF protection
  path: '/',                // Scope to entire site
  maxAge: 8 * 60 * 60,     // 8 hours
}
```

**Cookie Names**:
- `__Host-auth_token` - Main authentication token
- `csrf_token` - CSRF protection token

**Why `__Host-` prefix?**
- Prevents subdomain attacks
- Requires `secure=true` and `path=/`
- Cannot have `domain` attribute

### 7. Security Headers

**Implementation**: `next.config.mjs`

```javascript
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [detailed policy]
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 8. Secure Logging

**Implementation**: `lib/utils/logger.ts`

Automatically redacts sensitive data from logs:
- Passwords
- Tokens
- API keys
- Session IDs
- Partial masking for emails (shows first/last 2 chars)

**Example**:
```typescript
import { logger } from '@/lib/utils/logger'

logger.info('User login', {
  email: 'user@example.com',  // Will be masked as "us***om"
  password: 'secret123'        // Will be [REDACTED]
})
```

### 9. Account Lockout

**Implementation**: `lib/services/accountLockout.ts`

**Configuration**:
- Maximum failed attempts: 5
- Lockout duration: 15 minutes
- Auto-reset after successful login

**Database Schema**:
```sql
ALTER TABLE users
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
```

## 🚨 Security Best Practices

### Environment Variables

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use `.env.example` as template** - Safe to commit
3. **Rotate secrets regularly** - Especially after exposure
4. **Different secrets per environment** - Dev/Staging/Production

### JWT Secret Key

**Requirements**:
- Minimum 32 characters
- High entropy (random)
- Never hardcoded

**Generate secure secret**:
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Password Requirements

Enforced by validation schemas:
- Minimum length (configured per use case)
- No common passwords
- Hashed with bcrypt (10 rounds)

### API Security Checklist

- [ ] Authentication required?
- [ ] Input validation with Zod?
- [ ] Rate limiting applied?
- [ ] CSRF protection (if state-changing)?
- [ ] SQL injection prevention?
- [ ] Sensitive data logging avoided?

## 🔍 Security Monitoring

### What to Monitor

1. **Failed Login Attempts**
   - Check for patterns indicating brute force
   - Monitor locked accounts

2. **Rate Limit Violations**
   - Track 429 responses
   - Identify suspicious IPs

3. **CSRF Failures**
   - Investigate 403 responses
   - Check for malicious requests

4. **Error Logs**
   - SQL injection attempts
   - Invalid tokens
   - Unauthorized access attempts

## 🛡️ Incident Response

### If Secrets Are Exposed

1. **Immediate Actions**:
   ```bash
   # Check git history
   git log --all --full-history -- .env

   # Remove from history (if needed)
   git filter-repo --path .env --invert-paths
   ```

2. **Rotate All Credentials**:
   - JWT_SECRET_KEY
   - Google OAuth credentials
   - Supabase keys
   - Service account keys

3. **Invalidate Active Sessions**:
   - Change JWT secret (invalidates all tokens)
   - Notify users to re-login

### If Account is Compromised

1. Lock the account
2. Reset password
3. Invalidate all sessions
4. Review audit logs
5. Notify user

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)

## 🔄 Security Maintenance

### Regular Tasks

**Weekly**:
- Review error logs
- Check for failed logins
- Monitor rate limit violations

**Monthly**:
- Update dependencies (`npm audit`)
- Review security headers
- Test authentication flows

**Quarterly**:
- Rotate secrets
- Security audit
- Penetration testing (if applicable)

## 📞 Reporting Security Issues

If you discover a security vulnerability, please email: [security@example.com]

**Do NOT** create public GitHub issues for security vulnerabilities.

---

**Last Updated**: 2025-01-07
**Security Review**: Completed all 15 issues from security audit
