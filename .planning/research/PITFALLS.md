# Pitfalls Research

**Domain:** Learning Platform & Quiz/Assessment System
**Researched:** 2026-03-18
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Progress Tracking Data Loss

**What goes wrong:**
User progress gets lost, duplicated, or incorrectly calculated. Users complete articles but progress shows 0%, or progress resets mysteriously. Completion certificates unlock prematurely or never unlock despite meeting requirements.

**Why it happens:**
- Storing progress only in client state (localStorage, React state) without server persistence
- Race conditions when multiple requests update progress simultaneously
- No transactional integrity when marking articles complete
- Incorrect calculation logic (counting all articles vs. required articles only)
- Missing database indexes causing slow queries that timeout mid-update

**How to avoid:**
- Store ALL progress state in Supabase with proper RLS policies
- Use database transactions for progress updates
- Implement optimistic updates with rollback on failure
- Store progress incrementally (each article read) not just calculated totals
- Add database constraints to prevent invalid progress states (e.g., progress > 100%)
- Create comprehensive tests for progress calculation edge cases

**Warning signs:**
- Progress stored in localStorage or URL params
- No progress table in database schema
- Progress recalculation happens on every page load
- Users report "I finished but it says I didn't"

**Phase to address:**
Phase 1 (MC Bible Core) - Progress tracking is fundamental to the learning experience

---

### Pitfall 2: Quiz Answer State Corruption

**What goes wrong:**
User answers are lost, overwritten, or associated with wrong questions. Timer continues after submission. Answers from previous attempts appear in new attempts. Grading data doesn't match submitted answers.

**Why it happens:**
- Storing quiz state in React context without persistence
- Not clearing state between quiz attempts
- Race conditions in auto-save vs. manual save
- Missing unique constraints on (attempt_id, question_id)
- Timer state managed separately from answer state

**How to avoid:**
- Persist every answer change immediately to database
- Use composite primary key on submission answers table
- Implement proper state reset on quiz start/exit
- Store timer state with submission record
- Add database constraints preventing duplicate answers per attempt-question
- Create transaction boundaries for answer submission

**Warning signs:**
- Answers only saved on "Submit" button click
- No unique constraint on (attempt, question) pairs
- Timer in separate component from quiz state
- Context provides quiz state without DB sync

**Phase to address:**
Phase 2 (Championship Core) - Quiz integrity is critical for fair competition

---

### Pitfall 3: Role-Based Access Control Bypass

**What goes wrong:**
Users access admin panels they shouldn't see. Non-managers create/edit training content. Users grade their own submissions. Leaders access admin functions.

**Why it happens:**
- Only hiding UI elements based on role, not enforcing server-side
- Using admin client to bypass RLS during development and forgetting to remove
- Not validating roles on API routes
- Assuming client can be trusted
- Missing RLS policies on sensitive tables

**How to avoid:**
- Enforce role checks on EVERY API route, never just UI
- Write RLS policies for all tables (challenges, questions, submissions, etc.)
- Never use service_role key in user-facing routes
- Create middleware that validates roles before route handlers
- Audit all endpoints for role enforcement
- Test with different role accounts

**Warning signs:**
- Role checks only in React components
- Comments saying "bypass RLS" in user-facing code
- No RLS policies on admin tables
- Admin routes accessible to non-admin users in devtools

**Phase to address:**
Phase 1 (Admin Foundation) - Security must be built from the start

---

### Pitfall 4: Question Pool Reusability Breaking

**What goes wrong:**
Questions used in multiple challenges can't be updated independently. Changing a question affects historical challenge results. Deleting a question breaks past challenge data. Difficulty ratings become meaningless across different contexts.

**Why it happens:**
- Directly referencing questions in challenges without junction table
- Storing question text with challenge instead of question ID
- No versioning system for questions
- Not separating "question definition" from "question instance in challenge"

**How to avoid:**
- Use junction table for challenges_questions with snapshot fields
- Store question text/difficulty snapshot when adding to challenge
- Create question versioning system or accept immutability
- Allow question reuse without affecting existing challenges
- Consider "question template" vs "question instance" pattern

**Warning signs:**
- Questions table directly references challenge_id
- No junction table for many-to-many relationship
- Updating question updates it everywhere immediately
- Can't see what question looked like when challenge was taken

**Phase to address:**
Phase 3 (Question Management) - Question pools require proper data modeling

---

### Pitfall 5: Leaderboard Demotivation & Gaming

**What goes wrong:**
Bottom 80% of users stop participating. Users cheat by rushing through content. Same people always win, creating oligarchy. Users create multiple accounts to climb rankings. Toxic competition replaces collaboration.

**Why it happens:**
- Only showing top 10 leaderboard
- Ranking by quantity (articles read) not quality (quiz scores)
- No time-based segmentation (all-time vs monthly)
- Comparing new users with users who have months of data
- No protection against gaming the system

**How to avoid:**
- Show user's own rank and progress, not just top performers
- Create multiple leaderboard categories (monthly, quarterly, by topic)
- Use relative ranking (people like you) not absolute
- Rate-limit actions to prevent spam
- Weight quality over quantity
- Consider team-based leaderboards to encourage collaboration
- Reset leaderboards periodically to give newcomers a chance

**Warning signs:**
- Only global "all-time" leaderboard exists
- Ranking based on volume (articles read, challenges taken)
- No segmentation by timeframe or skill level
- Users can repeatedly take easy challenges for points

**Phase to address:**
Phase 2 (Championship Core) - Leaderboards are core to the championship feature

---

### Pitfall 6: Auto-Grading False Positives/Negatives

**What goes wrong:**
Correct answers marked wrong (false negatives frustrate users). Wrong answers accepted as correct (false positives compromise integrity). Partial credit not awarded for close answers. Cloze answers rejected for minor formatting differences.

**Why it happens:**
- Too strict string comparison (case-sensitive, extra spaces)
- Not accounting for multiple correct variations
- No fuzzy matching for typos or similar answers
- Drag-drop grading checking exact position not relative order
- Not normalizing input before comparison

**How to avoid:**
- Normalize input (trim, lowercase, remove extra whitespace)
- Implement fuzzy matching for cloze answers (Levenshtein distance)
- Allow multiple correct answer variations
- Test edge cases extensively (empty strings, special characters, Unicode)
- Provide feedback on WHY answer is wrong
- Consider confidence scoring for ambiguous matches
- Store exact user input for manual review of edge cases

**Warning signs:**
- String equality checks with ===
- No input normalization before comparison
- Can't specify multiple correct answers
- No tests for "almost correct" answers

**Phase to address:**
Phase 3 (Auto-Grading) - Auto-grading accuracy is critical for user trust

---

### Pitfall 7: Large File Upload Blocking & Memory Issues

**What goes wrong:**
File uploads (videos, PDFs) timeout. Server crashes when uploading large files. Progress bar doesn't update. No feedback on upload failures. CSV bulk question uploads fail silently.

**Why it happens:**
- Loading entire file into memory before processing
- Not implementing chunked uploads for large files
- No file size limits or validation
- Processing uploads synchronously
- Missing progress tracking for uploads
- Not handling network interruptions gracefully

**How to avoid:**
- Use streaming/chunked uploads for large files
- Implement file size limits with clear error messages
- Use background jobs/queues for processing uploads
- Provide real-time upload progress
- Store files in object storage (Supabase Storage), not database
- Validate file type and structure before full upload
- Implement retry logic for failed uploads
- Set appropriate timeout limits

**Warning signs:**
- File reading with fs.readFileSync() or similar
- No progress indicator during upload
- Entire file in single request body
- Processing blocks request handler
- No file size validation before upload

**Phase to address:**
Phase 1 (Content Management) - File uploads are needed from the start

---

### Pitfall 8: Challenge Timer Desynchronization

**What goes wrong:**
Timer shows different time on client vs server. Timer continues after submission. Timer doesn't pause if user leaves page. Timer expires but user can still submit. Users manipulate timer via browser DevTools.

**Why it happens:**
- Timer only in client state (React setInterval)
- Not recording start_time and end_time in database
- Trusting client-reported elapsed time
- No server-side validation of duration
- Not handling page visibility changes

**How to avoid:**
- Store start_time when user begins challenge (immutable)
- Calculate elapsed time on submission: end_time - start_time
- Never trust client-reported elapsed time
- Validate duration server-side before accepting submission
- Handle page visibility API to warn user (can't fully prevent tab-switching)
- Show "time elapsed" not "time remaining" to reduce manipulation incentive
- Log suspicious time patterns (faster than humanly possible)

**Warning signs:**
- Timer value stored in React state only
- Submission accepts client-provided duration
- No start_time timestamp in database
- Can submit after timer expires

**Phase to address:**
Phase 2 (Championship Core) - Timer integrity is essential for fair challenges

---

### Pitfall 9: Rich Text Content Security (XSS)

**What goes wrong:**
Malicious scripts injected through article content. User cookies stolen via content. Redirects to phishing sites. Defaced content. Stored XSS attacks affecting all users.

**Why it happens:**
- Using rich text editor (TinyMCE) without sanitization
- Not sanitizing HTML on server before storage
- Allowing unsafe HTML tags and attributes
- Not using Content Security Policy headers
- Trusting admin content (but admins can be compromised)

**How to avoid:**
- Sanitize ALL HTML on server before storage
- Use strict HTML whitelist (sanitize-html or similar)
- Remove dangerous tags (script, iframe, object, embed)
- Remove dangerous attributes (onclick, onerror, onload)
- Implement Content Security Policy headers
- Treat even admin content as potentially malicious
- Regular security audits of content

**Warning signs:**
- Storing raw TinyMCE output without sanitization
- No CSP headers configured
- Script tags allowed in content
- HTML attributes with "on" prefix not stripped

**Phase to address:**
Phase 1 (Content Management) - Security must be built in from the start

---

### Pitfall 10: Duplicate Code Between Web and Admin Apps

**What goes wrong:**
Bug fixed in one app but not the other. Features work differently in web vs admin. Inconsistent validation logic. Code changes need to be duplicated. Testing becomes impossible.

**Why it happens:**
- Copying service files between apps/web and apps/admin
- Not creating shared package structure
- Treating admin as separate application
- Not extracting shared business logic

**How to avoid:**
- Create shared packages for business logic
- Use monorepo workspaces properly
- Extract Bible/Challenge services to shared location
- Admin and web consume same services
- Single source of truth for business rules
- Consistent validation in shared layer

**Warning signs:**
- Same file name in apps/web and apps/admin
- Nearly identical code in multiple locations
- Bug fixes require changes in multiple files
- CONCERNS.md mentions this is already a problem!

**Phase to address:**
Phase 0 (Foundation) - Already identified in CONCERNS.md, must fix first

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `any` for database query results | Faster development, no type definition | Runtime errors, no autocomplete, unsafe | Never - use proper types or Zod validation |
| Client-side only progress tracking | Faster initial development, no DB work | Data loss, no sync across devices, can't recover | Never - progress is critical data |
| Skipping RLS policies for admin tables | Faster development, easier debugging | Security vulnerability, hard to add later | Development only, must add before production |
| Hardcoding role checks in components | Quick UI changes | Inconsistent security, bypassable | Never - always enforce server-side |
| Storing file uploads in base64 in DB | Simpler initial implementation | Database bloat, performance issues, scaling limits | MVP only for tiny files, migrate to storage |
| Using setInterval for timer | Simple implementation | Desync, manipulation, battery drain | Never - use server timestamps |
| Duplicating code between apps | Faster initial feature delivery | Maintenance nightmare, inconsistent behavior | Never - already identified as debt |
| Skipping validation on CSV upload | Faster bulk import | Bad data, silent failures, corruption risks | Never - validate everything |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Using `useUser()` only, checking roles in UI | Validate roles on every API route using auth.uid() and user_roles table |
| Supabase Storage | Uploading to default bucket without folder organization | Create organized bucket structure (bible/, challenges/, avatars/) |
| Supabase RLS | Creating policies but forgetting to `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | Always enable RLS after creating policies, test with anon key |
| TinyMCE | Trusting output without sanitization | Sanitize HTML server-side before storing, use strict whitelist |
| Google OAuth | Not handling revoked tokens or expired sessions | Implement proper token refresh, handle auth errors gracefully |
| CSV Bulk Upload | Not validating row structure before processing | Validate header row, check column count, validate data types |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries for challenge questions | Slow loading, many database round trips | Use JOIN or select related records in single query | 10+ questions per challenge |
| Client-side filtering large datasets | Slow UI, freezing browser | Server-side filtering with database indexes | 100+ articles/challenges |
| No pagination on admin tables | Long load times, browser crash | Implement pagination with cursor/offset | 50+ rows in table |
| Calculating progress on every view | Slow page loads, redundant queries | Cache progress, recalculate only on changes | 20+ articles per path |
| Loading all questions at once | Slow quiz initialization, memory issues | Load questions in batches or by section | 50+ questions in challenge |
| Missing database indexes | Gradually slowing queries | Add indexes on foreign keys and filter columns | 1000+ rows in table |
| File uploads processed synchronously | Request timeouts, server block | Use background jobs/queues for processing | 5+ concurrent uploads |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| IDOR in submission viewing | Users viewing others' submissions | Always validate auth.uid() === submission.user_id in RLS |
| Authenticated users accessing admin routes | Unauthorized admin access | Role checks on ALL admin API routes, not just UI |
| Storing secrets in client code | Credentials exposed to all users | Environment variables only on server, never client |
| File upload without type validation | Malware upload, XSS via files | Validate file type (magic numbers), sanitize filenames |
| Auto-grading without rate limiting | Automated answer guessing | Rate limit submission attempts per IP/user |
| SQL injection in question search | Database compromise | Use parameterized queries, never string concatenation |
| Weak JWT secrets | Token forgery | Use strong random secrets, rotate periodically, environment-specific |
| Cross-site scripting via rich text | Session hijacking, data theft | Sanitize ALL HTML, CSP headers, httpOnly cookies |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator | Users don't know how far along they are | Always show progress bar or percentage |
| Losing place on navigation | Users can't find where they left off | Remember last read article, show "Continue Reading" |
| Timer anxiety | Users rush, quality suffers | Show elapsed time, warn near end, consider pausing on visibility change |
| No feedback on wrong answers | Users don't learn from mistakes | Show explanations, allow reviewing answers |
| All-or-nothing scoring | One mistake feels like failure | Partial credit, show what was correct |
| Leaderboard showing only top 10 | Most users see themselves nowhere | Show user's own rank, relative position |
| No search in content | Can't find specific information | Full-text search across articles |
| Long articles without navigation | Hard to find specific sections | Table of contents, anchor links, section headers |
| No mobile optimization | Can't learn on the go | Responsive design, mobile-first approach |
| Unclear question requirements | Users answer incorrectly despite knowing answer | Clear instructions, examples, accepted formats |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Progress tracking:** Often missing server persistence — verify progress saves to database and survives page refresh
- [ ] **Quiz state:** Often missing conflict resolution — verify concurrent submissions handled correctly
- [ ] **Role-based access:** Often missing server enforcement — verify API routes reject unauthorized access
- [ ] **File uploads:** Often missing progress tracking — verify large uploads show progress and handle failures
- [ ] **Rich text content:** Often missing XSS sanitization — verify dangerous tags stripped from HTML
- [ ] **Timer functionality:** Often missing server validation — verify can't submit after time limit via API manipulation
- [ ] **Auto-grading:** Often missing edge case handling — verify partial credit, multiple correct answers, formatting tolerance
- [ ] **Leaderboards:** Often missing segmentation — verify new users have chance to compete, not dominated by early adopters
- [ ] **Question pools:** Often missing versioning — verify updating question doesn't break historical data
- [ ] **CSV bulk upload:** Often missing comprehensive error reporting — verify users see which rows failed and why
- [ ] **Search functionality:** Often missing performance optimization — verify search doesn't slow with 100+ articles
- [ ] **Email notifications:** Often missing unsubscribe handling — verify users can opt out of notifications

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Progress tracking data loss | HIGH | Add missing DB persistence, migrate any existing localStorage data, communicate with users about reset |
| Quiz state corruption | HIGH | Database migration to add constraints, data cleanup script, prevent new corrupt data, manual reconciliation of affected submissions |
| RBAC bypass vulnerabilities | CRITICAL | Immediate audit of all routes, add server-side role checks, revoke potentially compromised sessions, security review |
| Question pool reusability breaking | MEDIUM | Migration to add junction table, script to snapshot existing challenge-question relationships, update UI for new model |
| Leaderboard toxicity | LOW | Add segmentation, reset leaderboards, implement multiple ranking categories, communicate changes to users |
| Auto-grading false positives | MEDIUM | Add more lenient matching, re-grade affected submissions manually, implement appeal process, improve matching algorithm |
| File upload issues | MEDIUM | Migrate to object storage, implement chunked uploads, add progress tracking, update UI components |
| Timer desynchronization | MEDIUM | Add server-side validation, migrate to timestamp-based calculation, reject client-provided duration |
| XSS in rich text | CRITICAL | Immediate sanitize all existing content, add sanitization pipeline, security audit, force password reset if sessions compromised |
| Duplicate code between apps | HIGH | Extract to shared packages, gradual migration, thorough testing, monitor for regressions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate code (web/admin) | Phase 0 - Foundation | Code review shows shared services, no duplication |
| Progress tracking data loss | Phase 1 - MC Bible Core | Test: refresh page, progress persists across sessions |
| Role-based access bypass | Phase 1 - Admin Foundation | Test: non-admin can't access admin routes via API |
| File upload blocking | Phase 1 - Content Management | Test: upload 10MB+ file, see progress, completes successfully |
| Rich text XSS vulnerability | Phase 1 - Content Management | Test: inject script tags, stripped from output |
| Quiz answer state corruption | Phase 2 - Championship Core | Test: rapid-fire answers, leave/return, all saved correctly |
| Challenge timer desync | Phase 2 - Championship Core | Test: submit after timer via API, rejected |
| Leaderboard demotivation | Phase 2 - Championship Core | Test: new user sees competitive ranking, not just top 10 |
| Question pool reusability breaking | Phase 3 - Question Management | Test: update question, historical challenges unchanged |
| Auto-grading false negatives | Phase 3 - Auto-Grading | Test: submit minor variations (spacing, case), accepted appropriately |
| Performance issues | All phases | Load test: 100+ articles/challenges, pages load <2s |
| Security vulnerabilities | All phases | Security audit: no IDOR, no XSS, proper RLS on all tables |

## Sources

**Existing Codebase Analysis:**
- .planning/codebase/CONCERNS.md - Identified duplicate code, security issues, large service files
- .planning/PROJECT.md - Requirements for MC Bible and Championship features

**Domain Knowledge (Training Data - LOW confidence without verification):**
- LMS implementation patterns and common failures
- Educational assessment platform security issues
- Quiz system development challenges
- Gamification and leaderboard design principles
- Progress tracking and completion system issues
- Auto-grading implementation challenges

**Note:** Web search tools experienced technical difficulties during research. Findings are based on:
1. Analysis of existing codebase concerns
2. General knowledge of learning platform development patterns
3. Common issues in quiz/assessment systems
4. Database design and security best practices

**Confidence Level: MEDIUM** - Recommendations are based on established software engineering principles and common learning platform patterns, but specific 2025-2026 sources could not be verified due to search limitations. Recommend validation through:
- Supabase official documentation for RLS policies
- Next.js documentation for authentication patterns
- Educational technology case studies and post-mortems
- OWASP guidelines for web security

---
*Pitfalls research for: MC Bible & Knowledge Championship Learning Platform*
*Researched: 2026-03-18*
