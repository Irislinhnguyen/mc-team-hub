# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- TypeScript 5.8.3 - Core application code in Next.js apps and shared packages
- JavaScript - Package scripts and build tools

**Secondary:**
- Python 3.x - Used in scripts and for Google Apps Script extensions

## Runtime

**Environment:**
- Node.js - Runtime environment (exact version from pnpm-lock.yaml)
- Browser - Client-side execution

**Package Manager:**
- pnpm - Package manager with lockfile support
- Bun - Alternative package manager (bun.lockb present)

**Type System:**
- TypeScript - Type checking with strict mode disabled
- TSDoc - Documentation generation

## Frameworks

**Core:**
- Next.js 15.5.7 - React framework with App Router
- React 18.3.1 - UI library with concurrent features
- React DOM 18.3.1 - DOM rendering

**Testing:**
- Playwright 1.56-1.58 - E2E testing framework
- Concurrently - Run multiple dev servers

**Build/Dev:**
- Vercel - Deployment platform
- Turborepo - Monorepo build system (turbo config present)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.75.1 - Database client and authentication
- @supabase/ssr 0.7.0 - Server-side rendering utilities
- Neo4j driver 6.0.1 - Graph database (deprecated but still referenced)
- OpenAI 6.7.0 - AI/ML integration for query analysis

**Infrastructure:**
- @google-cloud/bigquery 8.1.1 - BigQuery integration
- googleapis 166.0.0 - Google API client
- Axios 1.12.2 - HTTP client for API calls
- Nodemailer 7.0.10 - Email sending (optional configuration)

**UI/UX:**
- Radix UI - Complete set of accessible UI primitives
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Lucide React 0.462.0 - Icon library
- Recharts 2.15.4 - Data visualization
- TinyMCE React 4.3.2 - Rich text editor

**State Management:**
- TanStack React Query 5.83.0 - Server state management
- React Hook Form 7.61.1 - Form management with Zod integration

## Configuration

**Environment:**
- Multi-environment support via .env files
- Separate configs for web and admin apps
- Environment variables for external service credentials

**Build:**
- Next.js specific configuration with security headers
- TypeScript configuration with path aliases for monorepo
- PostCSS and Tailwind CSS configuration
- ESLint with React plugin for code quality

## Platform Requirements

**Development:**
- Node.js LTS
- pnpm or bun package manager
- Playwright browsers for testing

**Production:**
- Vercel deployment platform
- Google Cloud Platform for BigQuery
- Supabase for database and auth
- Optional: Neo4j for graph database (deprecated)

---

*Stack analysis: 2026-03-18*