# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Google Cloud Platform:**
- BigQuery - Primary data warehouse for publisher data
  - SDK: @google-cloud/bigquery
  - Connection: Service account credentials (JSON or Base64 encoded)
  - Datasets: GI_publisher, geniee_ai
- Google OAuth 2.0 - Authentication provider
  - Client: googleapis
  - Configuration: Client ID and secret from Google Cloud Console
  - Domain restriction for enterprise login

**AI/ML Services:**
- OpenAI - AI-powered query analysis and insights
  - SDK: openai
  - API Key: OPENAI_API_KEY
  - Model: gpt-4-turbo-preview
  - Usage tracking integrated for analytics

**Enterprise APIs:**
- Neo4j Graph Database - Knowledge graph functionality
  - SDK: neo4j-driver
  - Status: Deprecated (replaced by Supabase)
  - Connection: URI and credentials in environment variables

## Data Storage

**Databases:**
- Supabase - Primary database and authentication
  - Connection: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Client: @supabase/supabase-js, @supabase/ssr
  - Service role key: SUPABASE_SERVICE_ROLE_KEY
- BigQuery - Cloud data warehouse
  - Connection: Google Cloud service account
  - Client: @google-cloud/bigquery

**File Storage:**
- Local filesystem - CSV files and Excel uploads
  - Bulk import scripts for data migration
- Supabase storage - Likely used for file attachments (not explicitly configured)

**Caching:**
- React Query - Client-side caching and state management
- Supabase - Built-in caching for database queries

## Authentication & Identity

**Auth Provider:**
- Google OAuth 2.0 - Primary authentication method
  - Implementation: Custom auth service with JWT tokens
  - Domain restriction: NEXT_PUBLIC_ALLOWED_DOMAIN
- JWT - Token-based authentication
  - Secret: JWT_SECRET_KEY (minimum 32 characters)
- Supabase - Secondary auth system (already configured)

## Monitoring & Observability

**Error Tracking:**
- Console logging - Basic error tracking
- Custom error handlers in middleware

**Logs:**
- Structured logging in API routes
- Debug scripts for troubleshooting data sync issues
- Sync logging for pipeline operations

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary deployment platform
  - Configuration: .vercel directory present
- Google Apps Script - Extension scripts
  - Location: google-apps-script directory
- Local development: Next.js dev servers

**CI Pipeline:**
- GitHub Actions - Not explicitly configured
- Manual scripts - Migration and sync scripts

## Environment Configuration

**Required env vars:**
- NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT
- NEXT_PUBLIC_BIGQUERY_DATASET
- NEXT_PUBLIC_BIGQUERY_AI_DATASET
- GOOGLE_APPLICATION_CREDENTIALS_JSON
- NEXT_PUBLIC_GOOGLE_CLIENT_ID
- NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
- NEXT_PUBLIC_ALLOWED_DOMAIN
- JWT_SECRET_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY (optional)

**Secrets location:**
- .env.local (development)
- .env.production (production)
- Environment variables in Vercel deployment

## Webhooks & Callbacks

**Incoming:**
- Google Sheets webhooks - Pipeline sync triggers
  - Implementation: /api/pipelines/webhook/sheet-changed/route.ts
- Custom webhook handlers for data synchronization

**Outgoing:**
- Email notifications via Nodemailer
  - Configuration: SMTP settings in environment
  - From address: noreply@example.com

---

*Integration audit: 2026-03-18*