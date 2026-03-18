# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
query-stream-ai/
├── app/                          # Next.js App Router pages and API routes
│   ├── api/                      # API routes (RESTful endpoints)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── bigquery/             # BigQuery integration
│   │   ├── performance-tracker/  # Performance tracking APIs
│   │   ├── sales-lists/          # Sales list management
│   │   ├── pipelines/           # Pipeline management
│   │   ├── teams/                # Team management
│   │   ├── gcpp-check/          # GCPP compliance checking
│   │   ├── admin/               # Admin functionality
│   │   ├── tools/               # Tool-specific APIs
│   │   └── query-lab/           # Query lab functionality
│   ├── (protected)/             # Protected routes requiring auth
│   │   ├── gcpp-check/          # GCPP monitoring dashboard
│   │   ├── performance-tracker/ # Performance analytics
│   │   ├── pipelines/           # Pipeline management
│   │   ├── tools/               # AI-powered tools
│   │   ├── bible/               # Training resources
│   │   ├── challenges/          # Knowledge challenges
│   │   └── admin/               # Admin interface
│   ├── components/              # React components
│   │   ├── ui/                  # Shared UI components (shadcn/ui)
│   │   ├── home/                # Home page components
│   │   ├── forms/               # Form components
│   │   ├── layout/              # Layout components
│   │   ├── pipelines/           # Pipeline-specific components
│   │   ├── sales-lists/         # Sales list components
│   │   ├── tools/               # Tool components
│   │   └── shared/              # Shared utility components
│   ├── contexts/                # React contexts for state management
│   ├── (public)/                # Static assets
│   └── globals.css             # Global styles
├── lib/                         # Shared library code
│   ├── api/                     # API client utilities
│   ├── config/                  # Configuration files
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # External service integrations
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   ├── middleware/              # Middleware implementations
│   └── supabase/               # Supabase client setup
├── scripts/                     # Build and utility scripts
└── sql-backup/                 # Database backup files
```

## Directory Purposes

**app/**: Next.js App Router containing all application pages and API routes
- **api/**: Backend API endpoints organized by domain
- **(protected)/**: Authentication-required routes with feature-based grouping
- **components/**: Reusable React components with clear hierarchy
- **contexts/**: Global state management through React Context

**lib/**: Shared business logic, utilities, and configuration
- **config/**: Feature-specific configurations and constants
- **hooks/**: Custom React hooks for data fetching and state management
- **services/**: External service integration classes
- **types/**: TypeScript type definitions across domains
- **utils/**: Helper functions for common operations

**components/** UI components organized by feature and reusability
- **ui/**: Shared UI components from shadcn/ui library
- **home/**: Landing page and main dashboard components
- **forms/**: Form components with validation and submission logic
- **layout/**: Layout components (Header, Navigation, etc.)
- **tools/**: Tool-specific components for various features

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with global providers
- `app/(protected)/page.tsx`: Main dashboard homepage
- `middleware.ts`: Route protection middleware
- `app/contexts/AuthContext.tsx`: Authentication context provider

**Configuration:**
- `lib/utils/config.ts`: Application settings and environment configuration
- `lib/config/queryClient.ts`: React Query configuration
- `lib/supabase/client.ts`: Supabase client setup

**Core Logic:**
- `lib/services/bigquery.ts`: BigQuery database operations
- `lib/services/supabase.ts`: Supabase database operations
- `lib/services/openai.ts`: OpenAI integration
- `app/api/`: RESTful API endpoints

**Testing:**
- Test files located adjacent to implementation files
- No dedicated test directory structure detected
- Component tests likely alongside components

## Naming Conventions

**Files:**
- **Pages:** `page.tsx` for route pages
- **Components:** `ComponentName.tsx` (PascalCase)
- **API Routes:** `route.ts` for endpoint handlers
- **Contexts:** `ContextName.tsx` for React contexts
- **Services:** `ServiceName.ts` for service classes
- **Utilities:** `utilityName.ts` or `helperName.ts`

**Directories:**
- **Feature-based:** `gcpp-check/`, `performance-tracker/`
- **Component types:** `ui/`, `forms/`, `layout/`
- **Cross-cutting:** `shared/`, `utils/`, `services/`

**Variables:**
- **Constants:** UPPER_SNAKE_CASE for configuration
- **Components:** PascalCase for React components
- **Functions:** camelCase for utility functions
- **Types:** PascalCase for interfaces and types

## Where to Add New Code

**New Feature:**
- API endpoints: `app/api/new-feature/`
- Page route: `app/(protected)/new-feature/page.tsx`
- Components: `app/components/new-feature/`
- Contexts: `app/contexts/NewFeatureContext.tsx`
- Services: `lib/services/newFeatureService.ts`
- Types: `lib/types/newFeature.ts`
- Hooks: `lib/hooks/useNewFeature.ts`

**New Component/Module:**
- **Components:** `app/components/[category]/ComponentName.tsx`
- **Shared components:** `app/components/shared/ComponentName.tsx`
- **UI components:** `app/components/ui/ComponentName.tsx`

**Utilities and Helpers:**
- **General utilities:** `lib/utils/helperName.ts`
- **Feature-specific utilities:** `lib/utils/[feature]/helperName.ts`
- **API utilities:** `lib/api/[service].ts`

**Configuration:**
- **Application config:** `lib/utils/config.ts`
- **Feature config:** `lib/config/[feature].ts`
- **Component config:** `lib/config/[feature].ts`

## Special Directories

**app/(protected)/:** Dynamic route group for authenticated routes
- Purpose: Routes requiring authentication
- Generated: No - manually organized
- Committed: Yes - part of version control

**app/api/:** API routes organized by domain
- Purpose: Backend API endpoints
- Generated: No - manually created
- Committed: Yes - business logic

**lib/types/:** Central type definitions
- Purpose: TypeScript interfaces and types
- Generated: No - manually maintained
- Committed: Yes - contracts and schemas

**sql-backup/:** Database backups and schema
- Purpose: Database state snapshots
- Generated: Yes - automated backups
- Committed: Yes - for development history

---

*Structure analysis: 2026-03-18*
