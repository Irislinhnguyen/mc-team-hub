# Architecture Patterns: Learning Platforms & Quiz Systems

**Domain:** Learning Management System (LMS) and Knowledge Testing
**Researched:** 2026-03-18
**Overall confidence:** HIGH

## Executive Summary

Learning platforms and quiz systems typically follow a **layered architecture** with clear separation between content delivery, progress tracking, and assessment. The existing query-stream-ai codebase already has the foundational patterns (Next.js App Router, Supabase, RLS) that align well with learning platform requirements.

Key architectural insights:
1. **Component boundaries** should follow domain separation (Bible vs Challenges) with shared infrastructure
2. **Data flow** should be unidirectional: content → progress → assessment → analytics
3. **Build order** matters: core content structure first, then progress tracking, then advanced features

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MC Bible UI  │  │ Challenges   │  │ Unified Admin Panel  │  │
│  │              │  │ UI           │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Application Logic Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Bible Service│  │ Challenge    │  │ Grading Service      │  │
│  │              │  │ Service      │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Progress     │  │ Auto-Grading │  │ Analytics Service    │  │
│  │ Service      │  │ Engine       │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Data Access Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Bible API    │  │ Challenge    │  │ Progress API         │  │
│  │ Routes       │  │ API Routes   │  │ Routes               │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Supabase DB  │  │ Supabase     │  │ Storage (Files)      │  │
│  │ (PostgreSQL) │  │ Auth         │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### MC Bible Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Path Service** | Manage learning paths (courses) | Article Service, Progress Service |
| **Article Service** | CRUD for articles/content | Path Service, Progress Service, Storage |
| **Progress Service** | Track user completion | Article Service, Analytics |
| **Search Service** | Full-text search across articles | Article Service |

### Knowledge Championship Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Challenge Service** | Manage challenges lifecycle | Question Service, Submission Service |
| **Question Service** | CRUD for questions, question pools | Challenge Service, Grading Service |
| **Submission Service** | Handle user attempts | Challenge Service, Question Service, Grading Service |
| **Grading Service** | Auto-grade and manual grading | Question Service, Submission Service |
| **Leaderboard Service** | Calculate rankings | Submission Service, Challenge Service |

### Shared Components

| Component | Responsibility | Used By |
|-----------|---------------|---------|
| **Auth Service** | JWT/OAuth, role-based access | All components |
| **User Service** | User profile, team assignments | Challenges (for team grading) |
| **Storage Service** | File uploads (article files, media) | Bible (articles) |
| **Notification Service** | Alerts and reminders (future) | Bible, Challenges |

## Data Flow

### Learning Flow (MC Bible)

```
1. User browses paths → Path Service → DB
                            ↓
2. User selects article → Article Service → DB
                            ↓
3. User marks complete → Progress Service → DB
                            ↓
4. Progress updated → Path Service → User (real-time)
                            ↓
5. Path completion → (optional) Badge/Certificate Service
```

### Assessment Flow (Challenges)

```
1. Challenge opens → Challenge Service → DB
                            ↓
2. User starts attempt → Submission Service → DB (create in_progress)
                            ↓
3. User answers questions → Question Service validates → DB
                            ↓
4. User submits → Submission Service → Grading Service
                                         ↓
                            Auto-grade objective questions (immediate)
                                         ↓
                            Flag essays for manual grading
                            ↓
5. Manual grading → Leader Service → DB (update scores)
                            ↓
6. All graded → Challenge Service → Leaderboard Service
                            ↓
7. Publish → Leaderboard → Users
```

## Patterns to Follow

### Pattern 1: Service Layer Pattern

**What:** Separate business logic from API routes and UI components

**When:** All database operations, business rules, calculations

**Example:**
```typescript
// lib/services/bibleService.ts
export class BibleService {
  async getPathWithProgress(pathId: string, userId: string) {
    // Business logic: combine path, articles, and progress
    const path = await this.getPath(pathId)
    const articles = await this.getPathArticles(pathId)
    const progress = await this.getUserProgress(userId, articles)
    return this.calculateProgress(path, articles, progress)
  }
}

// app/api/bible/paths/[id]/route.ts
export async function GET(request: NextRequest) {
  const bibleService = new BibleService(supabase)
  const path = await bibleService.getPathWithProgress(id, user.sub)
  return NextResponse.json({ path })
}
```

**Why:** Testability, reusability, clear separation of concerns

### Pattern 2: Repository Pattern (for Supabase)

**What:** Abstract Supabase queries behind repository classes

**When:** Complex queries, joins, aggregations

**Example:**
```typescript
// lib/repositories/pathRepository.ts
export class PathRepository {
  constructor(private supabase: SupabaseClient) {}

  async findWithArticleCounts(pathIds: string[]) {
    const { data } = await this.supabase
      .from('bible_path_articles')
      .select('path_id')
      .in('path_id', pathIds)
    return this.aggregateByPath(data)
  }
}
```

**Why:** Easy to mock for testing, centralize query logic

### Pattern 3: Event-Driven Progress Updates

**What:** Use triggers/events to update derived data

**When:** Progress calculations, leaderboard updates

**Example:**
```typescript
-- Database trigger for auto-calculation
CREATE TRIGGER update_submission_score
  AFTER INSERT OR UPDATE ON challenge_answers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_submission_score(submission_id);
```

**Why:** Data consistency, automatic updates, reduced application code

### Pattern 4: Strategy Pattern for Question Types

**What:** Different grading strategies per question type

**When:** Auto-grading logic

**Example:**
```typescript
interface GradingStrategy {
  grade(answer: any, correctAnswer: any): GradingResult
}

class ClozeGradingStrategy implements GradingStrategy {
  grade(answer: string, correctAnswer: ClozeAnswer): GradingResult {
    // Cloze-specific grading logic
  }
}

class DragDropGradingStrategy implements GradingStrategy {
  grade(answer: DropAnswer, correctAnswer: DropZone[]): GradingResult {
    // Drag-drop-specific grading logic
  }
}

// Usage
const strategies = {
  cloze: new ClozeGradingStrategy(),
  drag_drop: new DragDropGradingStrategy(),
  essay: new EssayGradingStrategy(), // Returns null (manual grading)
}
```

**Why:** Easy to add new question types, isolated logic, testable

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic API Routes

**What:** Business logic scattered across API routes

**Why bad:** Hard to test, code duplication, difficult to reuse

**Instead:** Move business logic to service layer, keep routes thin

### Anti-Pattern 2: N+1 Query Problem

**What:** Querying related data in loops

**Why bad:** Poor performance as data grows

**Example to avoid:**
```typescript
// BAD: N+1 queries
for (const path of paths) {
  path.articles = await supabase
    .from('bible_path_articles')
    .select('*')
    .eq('path_id', path.id)  // Query inside loop!
}

// GOOD: Single query with IN
const pathIds = paths.map(p => p.id)
const allArticles = await supabase
  .from('bible_path_articles')
  .select('*')
  .in('path_id', pathIds)
// Then join in application code
```

**Instead:** Batch queries, use joins, or database functions

### Anti-Pattern 3: Client-Side Authorization

**What:** Only hiding UI elements based on role

**Why bad:** Security vulnerability, users can bypass UI

**Instead:** Always validate on server (already done with RLS, keep this pattern)

### Anti-Pattern 4: Tight Coupling Between Bible and Challenges

**What:** Direct dependencies between Bible and Challenge code

**Why bad:** Hard to maintain, can't evolve independently

**Instead:** Share through well-defined interfaces (types), not direct imports

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Content storage** | Supabase DB fine | Supabase DB fine | Consider CDN for media |
| **Progress tracking** | DB table fine | DB table with indexes | Consider time-series DB |
| **Quiz submissions** | DB table fine | DB table with partitioning | Separate submissions DB |
| **Leaderboard calc** | Real-time DB query | Cached calculations | Pre-computed + Redis |
| **Search** | PostgreSQL full-text | PostgreSQL full-text | Elasticsearch/Algolia |

**Current scale target (MC team):** ~100 users → Current Supabase setup is sufficient

## Integration with Existing Architecture

### How Bible/Challenges Fit

```
Existing (query-stream-ai)          New (Bible/Challenges)
┌─────────────────────┐            ┌──────────────────────┐
│ Auth (Supabase)     │←──────────→│ Bible Auth           │
│ (Google OAuth)      │            │ Challenges Auth      │
└─────────────────────┘            └──────────────────────┘
        ↑                                   ↑
        │ Shared                           │ Uses same
        │                                  │
┌─────────────────────┐            ┌──────────────────────┐
│ RBAC (admin/manager/│←──────────→│ Role checks          │
│ leader/user)        │            │ (same roles)         │
└─────────────────────┘            └──────────────────────┘
        ↑                                   ↑
        │                                   │
┌─────────────────────┐            ┌──────────────────────┐
│ Supabase PostgreSQL │←──────────→│ Bible tables         │
│ (existing tables)   │            │ Challenge tables     │
└─────────────────────┘            └──────────────────────┘
        ↑                                   ↑
        │                                   │
┌─────────────────────┐            ┌──────────────────────┐
│ Next.js App Router  │←──────────→│ /bible routes        │
│ /app/api/           │            │ /challenges routes   │
└─────────────────────┘            └──────────────────────┘
```

### Shared Infrastructure

1. **Authentication:** Reuse existing Supabase auth, middleware, and AuthContext
2. **Authorization:** Reuse existing RBAC system (roles: admin, manager, leader, user)
3. **Database:** Add new tables to existing Supabase project
4. **Storage:** Use Supabase storage for article files and challenge media
5. **UI Components:** Reuse shadcn/ui components for consistency

### New Infrastructure Needed

1. **Bible Service:** `lib/services/bibleService.ts` - Path/article management
2. **Challenge Service:** `lib/services/challengeService.ts` - Challenge/question management
3. **Grading Service:** `lib/services/gradingService.ts` - Auto-grading logic
4. **Progress Service:** `lib/services/progressService.ts` - Progress tracking
5. **Question Repository:** `lib/repositories/questionRepository.ts` - Question pool management

## Suggested Build Order

Based on component dependencies and data flow:

### Phase 1: Core Content Structure (Foundation)
1. Bible database tables (paths, articles, path_articles)
2. Basic Bible API routes (CRUD)
3. Basic Bible UI (path list, article view)
4. **Why:** Everything else depends on content structure

### Phase 2: Progress Tracking
1. Progress database tables (user_progress)
2. Progress API routes (mark complete, get progress)
3. Progress UI (completion indicators, progress bars)
4. **Why:** Users need to track learning, required for certificates

### Phase 3: Challenge Foundation
1. Challenges database tables (challenges, questions)
2. Challenge API routes (CRUD, question management)
3. Basic Challenge UI (challenge list, question editor)
4. **Why:** Need questions before we can grade them

### Phase 4: Submission & Grading
1. Submissions database tables
2. Submission API routes (start, submit, auto-grade)
3. Grading Service (auto-grading logic)
4. Grading UI (manual grading interface)
5. **Why:** Core challenge functionality

### Phase 5: Advanced Features
1. Question pools/banks
2. Leaderboards
3. Analytics
4. Admin panels
5. **Why:** Enhancements on top of core functionality

### Phase 6: Integration & Polish
1. Unified admin interface
2. Search functionality
3. Certificates/badges
4. Performance optimization
5. **Why:** Polish and integration work

## Sources

Based on:
- **Existing codebase analysis** - HIGH confidence
- **Database schema review** (bible_tables.sql, challenges_tables.sql) - HIGH confidence
- **Type definitions** (bible.ts, challenge.ts) - HIGH confidence
- **Standard LMS patterns** - MEDIUM confidence (industry best practices)
- **Next.js/Supabase documentation** - HIGH confidence (reviewed existing implementation patterns)

### Architecture Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Component boundaries | HIGH | Based on existing code patterns |
| Data flow | HIGH | Matches existing query-stream-ai patterns |
| Service layer pattern | HIGH | Existing codebase already uses this |
| Scalability projections | MEDIUM | Standard patterns, not tested at scale |
| Build order | HIGH | Based on dependency analysis |
| Integration approach | HIGH | Verified against existing architecture |

---

*Architecture research: 2026-03-18*
