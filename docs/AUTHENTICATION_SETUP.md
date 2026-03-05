# Authentication System Setup Guide

## Overview
This guide will help you set up the authentication system with:
- ✅ Google OAuth (for @geniee.co.jp users)
- ✅ Admin login with email/password
- ✅ JWT-based session management
- ✅ Protected routes with middleware

---

## Step 1: Run Database Migration

You need to create the `users` table in Supabase.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project → **SQL Editor**
3. Open the migration file: `supabase/migrations/20250103_create_users_table.sql`
4. Copy and paste the entire SQL content into the SQL Editor
5. Click **"Run"** to execute the migration

### Option B: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option C: Using psql

```bash
psql -h db.lvzzmcwsrmpzkdpkllnu.supabase.co -U postgres -d postgres < supabase/migrations/20250103_create_users_table.sql
```

---

## Step 2: Seed Admin User

After the migration is complete, run the seed script:

```bash
node supabase/seeds/seed-admin.mjs
```

This will create an admin account with:
- **Email**: `admin@geniee.co.jp` (or value from `ADMIN_EMAIL` in `.env.local`)
- **Password**: `admin123` (or value from `ADMIN_PASSWORD` in `.env.local`)

⚠️ **IMPORTANT**: Change the default password in production!

To set a custom admin password, add to `.env.local`:

```env
ADMIN_EMAIL=admin@geniee.co.jp
ADMIN_PASSWORD=your-secure-password-here
ADMIN_NAME=System Administrator
```

Then re-run the seed script.

---

## Step 3: Install Required Dependencies

Make sure all dependencies are installed:

```bash
npm install bcryptjs @types/bcryptjs dotenv
```

---

## Step 4: Start the Development Server

```bash
npm run dev
```

---

## Testing Authentication

### Test Admin Login

1. Go to http://localhost:3000/auth
2. Click the **"Admin"** tab
3. Enter credentials:
   - Email: `admin@geniee.co.jp`
   - Password: `admin123` (or your custom password)
4. Click **"Sign in"**
5. You should be redirected to `/templates` with admin badge in header

### Test Google OAuth

1. Go to http://localhost:3000/auth
2. Click the **"Google"** tab (default)
3. Click **"Sign in with Google"**
4. Sign in with a `@geniee.co.jp` Google account
5. You should be redirected to `/templates` with your user info in header

### Test Protected Routes

1. Without logging in, try to access: http://localhost:3000/templates
2. You should be redirected to `/auth`
3. After logging in, you can access all protected routes

### Test Logout

1. Click the logout button in the header (logout icon)
2. You should be redirected to `/auth`
3. Your session should be cleared

---

## Files Created/Modified

### New Files
- `supabase/migrations/20250103_create_users_table.sql` - Users table schema
- `supabase/seeds/seed_admin_user.sql` - SQL seed (reference)
- `supabase/seeds/seed-admin.mjs` - Node.js seed script
- `lib/auth/server.ts` - Server-side auth helpers
- `app/api/auth/login-password/route.ts` - Admin login API
- `app/api/auth/me/route.ts` - Get current user API
- `app/contexts/AuthContext.tsx` - Client-side auth context
- `AUTHENTICATION_SETUP.md` - This setup guide

### Modified Files
- `lib/services/auth.ts` - Added password login & bcrypt
- `app/api/auth/callback/route.ts` - Save users to database
- `middleware.ts` - Added authentication verification
- `app/(protected)/layout.tsx` - Clarified auth enforcement
- `app/(auth)/auth/page.tsx` - Added admin login tab
- `app/layout.tsx` - Added AuthProvider
- `src/components/layout/HeaderBar.tsx` - Display user info & logout

---

## Architecture

### Authentication Flow

#### Google OAuth Flow
```
User → /auth (Google tab)
     → Click "Sign in with Google"
     → /api/auth/login (generate OAuth URL)
     → Google consent screen
     → /api/auth/callback (exchange code for token)
     → Check/create user in database
     → Generate JWT token
     → Set auth_token cookie
     → Redirect to /templates
```

#### Admin Password Flow
```
User → /auth (Admin tab)
     → Enter email + password
     → POST /api/auth/login-password
     → Verify credentials from database
     → Generate JWT token
     → Set auth_token cookie
     → Redirect to /templates
```

#### Protected Route Access
```
User → Request protected route (e.g. /templates)
     → Middleware intercepts
     → Check auth_token cookie
     → Verify JWT token
     → If valid: continue
     → If invalid: redirect to /auth
```

---

## Security Features

✅ **JWT tokens** with 8-hour expiry
✅ **Bcrypt password hashing** (10 rounds)
✅ **CSRF protection** for OAuth flow
✅ **Domain restriction** (@geniee.co.jp only for Google OAuth)
✅ **HTTP-only cookies** (secure in production)
✅ **Middleware route protection**
✅ **Server-side auth verification**

---

## Troubleshooting

### "Table not found" error
→ Run the database migration (Step 1)

### "Invalid credentials" when logging in
→ Make sure you seeded the admin user (Step 2)
→ Check that ADMIN_PASSWORD matches what you're entering

### "Not authenticated" after login
→ Check browser cookies (auth_token should be set)
→ Check that JWT_SECRET_KEY is set in .env.local
→ Check console for token verification errors

### Google OAuth not working
→ Verify NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
→ Check that redirect URI is configured in Google Console
→ Ensure you're using a @geniee.co.jp email

### Users not saved to database
→ Check SUPABASE_SERVICE_ROLE_KEY is set correctly
→ Verify users table exists in Supabase
→ Check API logs for errors

---

## Future Enhancements

Ideas for future development:

- [ ] Password reset flow for admin
- [ ] Two-factor authentication (2FA)
- [ ] Admin require both password + Google OAuth
- [ ] Session management dashboard
- [ ] Audit logging for auth events
- [ ] Rate limiting for login attempts
- [ ] Remember me functionality
- [ ] Multiple admin accounts management
- [ ] User profile editing
- [ ] Account deletion

---

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all environment variables are set
3. Review the troubleshooting section above
4. Check Supabase logs in dashboard

---

**Last Updated**: January 3, 2025
**Version**: 1.0.0
