/**
 * Monthly Challenge Feature - Type Definitions
 *
 * This file contains all TypeScript types for the Monthly Challenge feature,
 * including domain models, API request/response types, and UI-specific types.
 */

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const CHALLENGE_STATUSES = [
  'draft',
  'scheduled',
  'open',
  'closed',
  'grading',
  'completed',
] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const QUESTION_TYPES = ['essay', 'cloze', 'drag_drop'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const SUBMISSION_STATUSES = ['in_progress', 'submitted', 'graded', 'published'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const USER_TEAM_ROLES = ['leader', 'member'] as const;
export type UserTeamRole = (typeof USER_TEAM_ROLES)[number];

// =====================================================
// DOMAIN MODELS
// =====================================================

/**
 * Challenge - Main entity representing a monthly challenge
 */
export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  open_date: string; // ISO datetime
  close_date: string; // ISO datetime
  duration_minutes: number;
  max_attempts: number;
  status: ChallengeStatus;
  leaderboard_published_at: string | null;
  leaderboard_published_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields (not in DB, added by API)
  question_count?: number;
  submission_count?: number;
  pending_grading_count?: number;
  creator_name?: string;
}

/**
 * Challenge Question - Individual question within a challenge
 */
export interface ChallengeQuestion {
  id: string;
  challenge_id: string;
  question_type: QuestionType;
  question_text: string;
  options: QuestionOptions | null;
  correct_answer: any;
  points: number;
  display_order: number;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Question options based on type
 */
export type QuestionOptions = EssayQuestionOptions | ClozeQuestionOptions | DragDropQuestionOptions;

export interface EssayQuestionOptions {
  type: 'essay';
  max_length?: number;
  min_length?: number;
  hints?: string[];
}

export interface ClozeQuestionOptions {
  type: 'cloze';
  gaps: ClozeGap[];
}

export interface ClozeGap {
  id: string; // e.g., "gap-1"
  choices: string[]; // Available choices for this gap
  correct_index: number; // Index of correct answer in choices array
  shuffle?: boolean; // Whether to shuffle choices display
  case_sensitive?: boolean; // Whether answer matching is case-sensitive
}

export interface DragDropQuestionOptions {
  type: 'drag_drop';
  items: DraggableItem[];
  dropZones: DropZone[];
  allow_multiple_items_per_zone?: boolean;
}

export interface DraggableItem {
  id: string;
  content: string;
  image_url?: string;
}

export interface DropZone {
  id: string;
  label?: string;
  correct_item_ids: string[]; // Items that belong here
  image_url?: string;
}

/**
 * Challenge Submission - User's attempt at a challenge
 */
export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  auto_score: number | null;
  auto_score_max: number | null;
  final_score: number | null;
  final_score_max: number | null;
  status: SubmissionStatus;
  user_team_id: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields (joined by API)
  user_name?: string;
  user_email?: string;
  team_name?: string;
  answers?: ChallengeAnswer[];
  rank?: number; // For leaderboard
}

/**
 * Challenge Answer - User's answer to a specific question
 */
export interface ChallengeAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string | null;
  answer_data: any;
  answer_order: string[] | null;
  is_auto_graded: boolean;
  auto_score: number | null;
  auto_feedback: string | null;
  manual_score: number | null;
  manual_feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  grading_modified_by: string | null;
  grading_modified_at: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields
  question?: ChallengeQuestion;
  graded_by_name?: string;
  grading_modified_by_name?: string;
}

/**
 * User Team Assignment - Links users to teams for leader grading
 */
export interface UserTeamAssignment {
  id: string;
  user_id: string;
  team_id: string;
  role: UserTeamRole;
  assigned_at: string;
  assigned_by: string | null;
  updated_at: string;

  // Computed fields
  user_name?: string;
  user_email?: string;
  team_name?: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Create Challenge Request
 */
export interface CreateChallengeRequest {
  name: string;
  description?: string;
  open_date: string; // ISO datetime
  close_date: string; // ISO datetime
  duration_minutes: number;
  max_attempts: number;
}

/**
 * Update Challenge Request
 */
export interface UpdateChallengeRequest {
  name?: string;
  description?: string | null;
  open_date?: string;
  close_date?: string;
  duration_minutes?: number;
  max_attempts?: number;
  status?: ChallengeStatus;
}

/**
 * Create Question Request
 */
export interface CreateQuestionRequest {
  question_type: QuestionType;
  question_text: string;
  options: QuestionOptions;
  points?: number;
  display_order?: number;
  media_url?: string;
}

/**
 * Update Question Request
 */
export interface UpdateQuestionRequest {
  question_text?: string;
  options?: QuestionOptions;
  points?: number;
  display_order?: number;
}

/**
 * Start Challenge Request
 */
export interface StartChallengeRequest {
  challenge_id: string;
  attempt_number?: number;
}

/**
 * Submit Answer Request
 */
export interface SubmitAnswerRequest {
  question_id: string;
  answer_text?: string;
  answer_data?: any;
  answer_order?: string[];
}

/**
 * Submit All Answers Request (final submission)
 */
export interface SubmitChallengeRequest {
  answers: SubmitAnswerRequest[];
  time_spent_seconds: number;
}

/**
 * Grade Answer Request (for Leader/Manager)
 */
export interface GradeAnswerRequest {
  score: number;
  feedback?: string;
}

/**
 * Bulk Grade Request
 */
export interface BulkGradeRequest {
  grades: Array<{
    answer_id: string;
    score: number;
    feedback?: string;
  }>;
}

/**
 * Publish Leaderboard Request
 */
export interface PublishLeaderboardRequest {
  publish: boolean;
}

/**
 * API Response Wrappers
 */
export interface ChallengesListResponse {
  challenges: Challenge[];
  total?: number;
}

export interface ChallengeResponse {
  challenge: Challenge;
}

export interface QuestionsListResponse {
  questions: ChallengeQuestion[];
  total?: number;
}

export interface SubmissionsListResponse {
  submissions: ChallengeSubmission[];
  total?: number;
}

export interface GradingQueueResponse {
  grading_queue: GradingQueueItem[];
  pending_count: number;
}

/**
 * Leaderboard Entry
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  user_email?: string;
  team_id?: string;
  team_name?: string;
  score: number;
  max_score: number;
  percentage: number;
  time_spent_seconds: number | null;
  submitted_at: string;
  is_current_user?: boolean;
}

/**
 * Leaderboard Response
 */
export interface LeaderboardResponse {
  challenge_id: string;
  challenge_name: string;
  entries: LeaderboardEntry[];
  total_participants: number;
  user_rank?: number; // Current user's rank if viewing
}

/**
 * Grading Queue Item
 */
export interface GradingQueueItem {
  id: string;
  answer_id: string;
  challenge_id: string;
  question_id: string;
  submission_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  team_id: string | null;
  question_text: string;
  question_type: QuestionType;
  answer_text: string | null;
  current_score: number | null;
  max_score: number;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
}

// =====================================================
// FILE UPLOAD TYPES
// =====================================================

/**
 * Parsed Question File Result
 */
export interface ParsedQuestionFile {
  questions: ParsedQuestion[];
  errors: ParseError[];
}

/**
 * Parsed Question (from CSV/XML)
 */
export interface ParsedQuestion {
  type: QuestionType;
  question_text: string;
  options: QuestionOptions;
  points?: number;
}

/**
 * Parse Error
 */
export interface ParseError {
  row: number;
  field: string;
  message: string;
}

/**
 * CSV Question Row (raw format)
 */
export interface CSVQuestionRow {
  type: string; // 'essay', 'cloze', 'drag_drop'
  question: string;
  choices?: string; // Pipe-separated for cloze: "Paris|London|Berlin"
  items?: string; // Pipe-separated for drag-drop items
  zones?: string; // Pipe-separated for drag-drop zones
  correct?: string; // Correct answer mapping: "Item1->Zone1,Item2->Zone2"
  points?: string;
}

/**
 * File Upload Result
 */
export interface FileUploadResult {
  success: boolean;
  questions_added: number;
  errors?: ParseError[];
}

// =====================================================
// UI-SPECIFIC TYPES
// =====================================================

/**
 * Challenge Card Props (for homepage display)
 */
export interface ChallengeCardProps {
  challenge: Challenge;
  onClick: () => void;
  canTake?: boolean;
  canView?: boolean;
}

/**
 * Question Display Props
 */
export interface QuestionDisplayProps {
  question: ChallengeQuestion;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
  showResult?: boolean;
  userAnswer?: ChallengeAnswer;
  questionNumber: number;
}

/**
 * Grading Panel Props
 */
export interface GradingPanelProps {
  answer: ChallengeAnswer;
  question: ChallengeQuestion;
  submission: ChallengeSubmission;
  onSubmitGrade: (answerId: string, score: number, feedback: string) => void;
  canModify?: boolean; // For manager override
}

/**
 * Leaderboard Table Props
 */
export interface LeaderboardTableProps {
  challengeId: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  filterByTeam?: string;
}

/**
 * Challenge Timer State
 */
export interface ChallengeTimerState {
  remaining_seconds: number;
  is_paused: boolean;
  is_expired: boolean;
}

// =====================================================
// VALIDATION RULES
// =====================================================

export const challengeValidation = {
  name: {
    minLength: 3,
    maxLength: 200,
  },
  description: {
    maxLength: 2000,
  },
  duration_minutes: {
    min: 1,
    max: 480, // 8 hours max
  },
  max_attempts: {
    min: 1,
    max: 10,
  },
};

export const questionValidation = {
  question_text: {
    minLength: 5,
    maxLength: 5000,
  },
  points: {
    min: 1,
    max: 100,
  },
};

// =====================================================
// PERMISSION HELPERS
// =====================================================

/**
 * Challenge Permissions per role
 */
export interface ChallengePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canSubmit: boolean;
  canGrade: boolean;
  canViewLeaderboard: boolean;
  canModifyGrades: boolean;
}

/**
 * Get challenge permissions based on user role
 */
export function getChallengePermissions(
  userRole: string,
  challengeStatus: ChallengeStatus,
  isTeamMember?: boolean
): ChallengePermissions {
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isLeader = userRole === 'leader';
  const isUser = userRole === 'user';

  return {
    canView: isAdmin || isManager || isLeader || (challengeStatus !== 'draft'),
    canCreate: isAdmin || isManager,
    canEdit: isAdmin || isManager,
    canDelete: isAdmin || isManager,
    canPublish: isAdmin || isManager,
    canSubmit: !isAdmin && !isManager && !isLeader && challengeStatus === 'open',
    canGrade: (isAdmin || isManager || (isLeader && isTeamMember)) && challengeStatus !== 'draft',
    canViewLeaderboard: challengeStatus === 'completed' || isAdmin || isManager,
    canModifyGrades: isAdmin || isManager,
  };
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export type {
  // Domain models
  Challenge,
  ChallengeQuestion,
  ChallengeSubmission,
  ChallengeAnswer,
  UserTeamAssignment,

  // Question options
  QuestionOptions,
  EssayQuestionOptions,
  ClozeQuestionOptions,
  ClozeGap,
  DragDropQuestionOptions,
  DraggableItem,
  DropZone,

  // API types
  CreateChallengeRequest,
  UpdateChallengeRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  StartChallengeRequest,
  SubmitAnswerRequest,
  SubmitChallengeRequest,
  GradeAnswerRequest,
  BulkGradeRequest,
  PublishLeaderboardRequest,

  // Response types
  ChallengesListResponse,
  ChallengeResponse,
  QuestionsListResponse,
  SubmissionsListResponse,
  GradingQueueResponse,
  LeaderboardResponse,
  LeaderboardEntry,
  GradingQueueItem,

  // File upload types
  ParsedQuestionFile,
  ParsedQuestion,
  ParseError,
  CSVQuestionRow,
  FileUploadResult,

  // UI types
  ChallengeCardProps,
  QuestionDisplayProps,
  GradingPanelProps,
  LeaderboardTableProps,
  ChallengeTimerState,

  // Permission types
  ChallengePermissions,
};
