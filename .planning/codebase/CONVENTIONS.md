# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `use-toast.ts`, `statusUtils.ts`)
- API route files: lowercase with dashes (e.g., `generate-csv/route.ts`)
- Service files: camelCase (e.g., `csvGeneratorService`)
- Type files: plural nouns (e.g., `challenge.ts`, `analytics.ts`)
- Test files: `.spec.ts` suffix

**Functions:**
- Public functions: camelCase (e.g., `getUserFromRequest`, `generateZoneCSV`)
- Private functions: underscore prefix (e.g., `_createSession`, `_validateInput`)
- Event handlers: camelCase (e.g., `handleSubmit`, `handleLogin`)
- Utility functions: camelCase (e.g., `getColor`, `getSurfaceColor`)

**Variables:**
- Local variables: camelCase (e.g., `authToken`, `pathname`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`)
- React state: camelCase (e.g., `currentPage`, `isLoading`)
- Component props: camelCase (e.g., `pageTitle`, `onSubmit`)

**Types:**
- Interface: PascalCase (e.g., `UserPreferences`, `ToastProps`)
- Type aliases: PascalCase (e.g., `ColorKey`, `SessionData`)
- Enum: PascalCase (e.g., `UserRole`, `SessionStatus`)

## Code Style

**Formatting:**
- Tool: ESLint with TypeScript-ESLint plugin
- Indentation: Tabs (as per ESLint config ignoring indentation rules)
- Line length: No hard limit, but wrapped at 100 characters
- Trailing commas: Always in multi-line structures

**Linting:**
- Tool: ESLint
- Config: `eslint.config.js` in root and `/apps/web/`
- Key rules:
  - `@typescript-eslint/no-unused-vars`: "off"
  - `@typescript-eslint/no-explicit-any`: "off"
  - `@typescript-eslint/no-empty-object-type`: "off"
  - `prefer-const`: "off"
  - React hooks rules enforced

**Imports:**
```typescript
// Order: External → Internal → Relative
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/auth/server'
import { generateZoneCSV } from '@/lib/services/tools/csvGeneratorService'
```

## Error Handling

**Patterns:**
```typescript
// API route error handling
try {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('table').select('*')

  if (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
} catch (error: any) {
  console.error('[API] Error:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Client-side error handling
try {
  const result = await someAsyncOperation()
  return result
} catch (error) {
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
  })
  throw error
}
```

**Error Logging:**
- Prefix all logs with `[Module] Context` (e.g., `[Middleware]`, `[Sessions API]`)
- Include relevant data in logs (user ID, request details)
- Never log sensitive information (passwords, tokens)

## Logging

**Framework:** console.log with structured prefixes

**Patterns:**
```typescript
// Authentication
console.log('[Middleware] User already authenticated, redirecting from /auth to home')
console.log('[Sessions API] User 123 fetching sessions')

// API requests
console.log(`[Generate CSV API] User ${user.id} generating zones`)
console.log(`[Generate CSV API] Zone URL: ${zoneUrl}`)
console.log(`[Generate CSV API] Prompt: ${prompt}`)

// Error handling
console.error('[Sessions API] Error fetching sessions:', error)
```

## Comments

**When to Comment:**
- Complex business logic in API routes
- Edge cases in data processing
- Workarounds for Edge Runtime limitations
- TODO comments for planned improvements
- API route documentation

**JSDoc/TSDoc:**
- Used for utility functions
- Required for public APIs and hooks
- Include parameters, return values, and examples

```typescript
/**
 * Gets the current user from the request
 * @param request - Next.js request object
 * @returns User object or null if not authenticated
 */
export function getUserFromRequest(request: NextRequest): User | null
```

## Function Design

**Size:**
- Keep functions under 50 lines
- Break down complex logic into smaller functions
- Single responsibility principle

**Parameters:**
- Prefer objects for multiple parameters
- Use destructuring with defaults
- Validate all input parameters

**Return Values:**
- Always return consistent types
- Use Result/Either pattern for async operations
- Return error objects with messages

## Module Design

**Exports:**
- Named exports preferred over default
- Export types and interfaces
- Group related exports in barrel files

**Barrel Files:**
- Use in `lib/` for organizing utilities
- Re-export commonly used functions
- Example: `lib/tools/index.ts` exporting all tool utilities

**Type Safety:**
- Use `as const` for literal types
- Enable strict mode where possible
- Avoid `any` type (disabled in config)

## React Patterns

**Component Structure:**
```typescript
// Functional component with TypeScript
interface MyComponentProps {
  title: string
  onSubmit: (data: FormData) => void
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [state, setState] = useState<StateType>(initialState)

  return (
    <div>
      <h1>{title}</h1>
      {/* Component content */}
    </div>
  )
}
```

**Custom Hooks:**
- Use `useCallback` for event handlers
- Memoize expensive computations
- Follow naming convention `use[Name]`

**State Management:**
- Local state for component-specific data
- Context for global state (use sparingly)
- Server state via TanStack Query or SWR

---

*Convention analysis: 2026-03-18*