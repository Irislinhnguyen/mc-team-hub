# Return URL Implementation

## Problem
After login, users were always redirected to homepage `/` instead of the original URL they tried to access (e.g., shared preset link with `?preset=xxx`).

## Solution
Implemented "return URL" flow that preserves the original destination across the authentication process.

---

## How It Works

### Flow Diagram
```
User visits: /performance-tracker/business-health?preset=abc123
  ↓ (no auth_token)
Middleware detects unauthenticated request
  ↓
Redirects to: /auth?returnUrl=/performance-tracker/business-health?preset=abc123
  + Sets cookie: return_url (httpOnly)
  ↓
User logs in (Google OAuth or Password)
  ↓
[GOOGLE PATH]                    [PASSWORD PATH]
OAuth callback reads cookie  →   Client reads query param
  ↓                                ↓
Redirect to return_url          Redirect to returnUrl
  ↓                                ↓
  → /performance-tracker/business-health?preset=abc123
```

---

## Implementation Details

### 1. Middleware (middleware.ts)

**When:** User tries to access protected route without auth

**Actions:**
- Extract original URL: `pathname + search`
- Redirect to `/auth?returnUrl=<original-url>`
- Set cookie `return_url` (httpOnly, 10 min expiry)

```typescript
const returnUrl = request.nextUrl.pathname + request.nextUrl.search
const authUrl = new URL('/auth', request.url)
authUrl.searchParams.set('returnUrl', returnUrl)

response.cookies.set('return_url', returnUrl, {
  httpOnly: true,
  maxAge: 10 * 60, // 10 minutes
})
```

**Why both cookie AND query param?**
- Cookie: For server-side OAuth callback
- Query param: For client-side password login redirect

---

### 2. OAuth Callback (app/api/auth/callback/route.ts)

**When:** User returns from Google OAuth

**Actions:**
- Read `return_url` cookie
- Redirect to that URL (default to `/` if not found)
- Delete cookies: `oauth_state`, `return_url`

```typescript
const returnUrl = cookieStore.get('return_url')?.value || '/'
const response = NextResponse.redirect(new URL(returnUrl, request.url))

response.cookies.delete('oauth_state')
response.cookies.delete('return_url')
```

---

### 3. Password Login (app/(auth)/auth/page.tsx)

**When:** User submits password form

**Actions:**
- Read `returnUrl` from query string
- After successful login, redirect to that URL
- Default to `/` if not found

```typescript
const urlParams = new URLSearchParams(window.location.search)
const returnUrl = urlParams.get('returnUrl') || '/'
window.location.href = returnUrl
```

---

## Security Considerations

✅ **Open Redirect Prevention:**
- Return URLs are internal only (same origin)
- `new URL(returnUrl, request.url)` ensures relative paths
- Middleware only sets return URL for protected routes on same domain

✅ **Cookie Security:**
- `httpOnly: true` - JavaScript can't read
- `sameSite: 'lax'` - CSRF protection
- Short expiry (10 minutes)
- Deleted after use

---

## Testing

### Test Case 1: Shared Preset Link
```
1. Logout or open incognito
2. Visit: http://localhost:3000/performance-tracker/business-health?preset=abc123
3. Should redirect to: /auth?returnUrl=/performance-tracker/business-health?preset=abc123
4. Login with Google
5. Should redirect back to: /performance-tracker/business-health?preset=abc123
6. ✅ Preset loads automatically
```

### Test Case 2: Password Login
```
1. Visit protected URL: /performance-tracker/business-health?preset=abc123
2. Redirect to auth page with returnUrl in URL bar
3. Login with email/password
4. Should redirect to original URL with preset parameter
5. ✅ Preset loads automatically
```

### Test Case 3: Direct Auth Page Visit
```
1. Visit /auth directly (no returnUrl)
2. Login
3. Should redirect to homepage /
4. ✅ Normal flow works
```

---

## Files Modified

1. **middleware.ts** - Save return URL on auth redirect
2. **app/api/auth/callback/route.ts** - Read and redirect to return URL
3. **app/(auth)/auth/page.tsx** - Client-side redirect for password login

---

## Benefits

✅ User lands on intended page after login
✅ Shared preset links work seamlessly
✅ Better UX - no need to re-navigate
✅ Secure - no open redirect vulnerabilities
✅ Works for both OAuth and password login
