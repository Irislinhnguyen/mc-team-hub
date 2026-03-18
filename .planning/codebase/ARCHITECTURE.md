# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Next.js Full-Stack Application with API Routes and Context Management

**Key Characteristics:**
- Full-stack TypeScript application with Next.js framework
- API Routes for backend functionality
- React Context for state management
- Authentication via JWT with Google OAuth
- Integration with BigQuery database and Supabase
- Client-side data fetching with TanStack Query
- Feature-based routing with dynamic imports

## Layers

### Presentation Layer
**Purpose:** UI components and user interface management
**Location:** `app/`
- **Root Layout**: Global providers and configuration
- **Route Groups**: Feature-based organization (`(protected)/` routes)
- **Client Components**: Interactive React components with hooks
- **Server Components**: Static and server-rendered content

### Application Logic Layer
**Purpose:** Business logic and application coordination
**Location:** `lib/hooks/`, `lib/services/`, `app/contexts/`
- **Context Providers**: Authentication, data sharing contexts
- **Custom Hooks**: State management and API interaction
- **Services**: External service integrations (BigQuery, Supabase, OpenAI)
- **Utilities:** Helper functions and business logic

### Data Access Layer
**Purpose:** Database and external API access
**Location:** `lib/services/`, `app/api/`
- **API Routes**: RESTful endpoints with Next.js route handlers
- **Service Classes**: Database operations and API client management
- **Configuration:** Settings and connection management

### Infrastructure Layer
**Purpose:** External services and integrations
**Location:** `lib/config/`, `lib/utils/`
- **Database Configuration:** BigQuery and Supabase setup
- **Authentication:** JWT and OAuth configuration
- **API Clients:** External service integrations

## Data Flow

### Authentication Flow:
1. User visits protected route
2. Middleware checks for auth cookie
3. If authenticated, proceed to page
4. If not, redirect to `/auth`
5. AuthProvider maintains user state and refreshes tokens
6. API routes validate JWT tokens on each request

### Data Fetching Flow:
1. Component uses React Query hook
2. Hook makes API request via route
3. API route queries BigQuery/Supabase
4. Response processed and returned
5. Component receives data via React Query cache

### Form Submission Flow:
1. User submits form with client-side validation
2. Data sent to API route
3. API route processes and validates data
4. Database updates via BigQuery/Supabase
5. Response triggers UI updates

## Key Abstractions

### Context Providers
- **AuthProvider:** JWT-based authentication with auto-refresh
- **SalesListContext:** Sales list data sharing and management
- **PipelineContext:** Pipeline data state management
- **CrossFilterContext:** Cross-component filter sharing

### Service Classes
- **BigQueryService:** Singleton for BigQuery operations
- **SupabaseService:** Database operations and authentication
- **OpenAIService:** AI integration for natural language processing
- **GoogleSheetsService:** Google Sheets integration

### React Query Patterns
- Custom hooks for specific queries and mutations
- Error boundary integration
- Loading state management
- Optimistic updates for better UX

## Entry Points

### Main Application Entry
**Location:** `app/layout.tsx`
- Sets up global providers and configuration
- Initializes authentication and query client
- Provides base layout structure

### Protected Routes
**Location:** `app/(protected)/`
- All routes require authentication
- Nested route structure for features
- Dynamic segments for data-specific pages

### API Routes
**Location:** `app/api/`
- RESTful endpoints organized by feature
- BigQuery integration endpoints
- Authentication endpoints
- Data processing endpoints

### Authentication Flow
**Location:** `middleware.ts`, `app/contexts/AuthContext.tsx`
- Edge middleware for route protection
- Context provider for state management
- Automatic token refresh on window focus

## Error Handling

**Strategy:** Layered error handling with graceful degradation

**Patterns:**
- API route try-catch blocks with proper HTTP status codes
- React Query error boundaries for UI errors
- Context-level error state management
- Logging to console and external services when available

## Cross-Cutting Concerns

**Logging:** Console logging with structured format, error tracking capabilities
**Validation:** Client and server-side validation using schema definitions
**Authentication:** JWT-based with session refresh and role-based access
**Caching:** React Query for data caching and revalidation

---

*Architecture analysis: 2026-03-18*
