/**
 * MC Bible (Course Edition) - Type Definitions
 *
 * This file contains all TypeScript types for the MC Bible knowledge base
 * and learning platform, including domain models, API request/response types,
 * and UI-specific types.
 */

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const ARTICLE_CONTENT_TYPES = [
  'article',
  'howto',
  'video',
  'file',
  'slides',
] as const;

export type ArticleContentType = (typeof ARTICLE_CONTENT_TYPES)[number];

// =====================================================
// DOMAIN MODELS
// =====================================================

/**
 * Path - A learning path (e.g., "Sales Onboarding", "CS Training")
 */
export interface Path {
  id: string;
  title: string;
  description: string | null;
  icon: string | null; // emoji or icon name
  color: string | null; // theme color for UI
  sections: string[]; // Array of section names for organizing articles
  created_by: string;
  created_at: string;
  updated_at: string;

  // Computed fields (not in DB, added by API)
  article_count?: number;
  completed_count?: number; // Number of articles completed by current user
  progress_percentage?: number; // 0-100
  creator_name?: string;
  articles?: PathArticle[];
}

/**
 * Article - Individual content page (rich text, video, files, slides)
 */
export interface Article {
  id: string;
  title: string;
  content: string; // rich HTML/Markdown content
  content_type: ArticleContentType;
  video_url: string | null; // for video type
  file_url: string | null; // for file attachments
  file_name: string | null; // original file name
  file_size: number | null; // file size in bytes
  slide_deck_url: string | null; // for slides type (Google Slides, PowerPoint Online)
  quiz_data: QuizQuestion[] | null; // Quiz questions embedded in article
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Computed fields
  creator_name?: string;
  is_completed?: boolean; // For current user
  completed_at?: string | null;
}

/**
 * Quiz Question
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number; // Index of correct option (0-based)
  explanation?: string; // Optional explanation shown after answering
}

/**
 * PathArticle - Junction table linking articles to paths with order
 */
export interface PathArticle {
  id: string;
  path_id: string;
  article_id: string;
  display_order: number;
  is_required: boolean;
  section: string | null; // Section name within the path (e.g., "Basics", "Advanced")

  // Joined fields
  article?: Article;
}

/**
 * UserProgress - Tracks which articles user has read/completed
 */
export interface UserProgress {
  id: string;
  user_id: string;
  article_id: string;
  completed_at: string;

  // Joined fields
  article?: Article;
  path?: Path;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Create Path Request
 */
export interface CreatePathRequest {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Update Path Request
 */
export interface UpdatePathRequest {
  title?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

/**
 * Create Article Request
 */
export interface CreateArticleRequest {
  title: string;
  content: string;
  content_type?: ArticleContentType;
  video_url?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  slide_deck_url?: string;
  quiz_data?: QuizQuestion[];
  tags?: string[];
}

/**
 * Update Article Request
 */
export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  content_type?: ArticleContentType;
  video_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  slide_deck_url?: string | null;
  quiz_data?: QuizQuestion[] | null;
  tags?: string[] | null;
}

/**
 * Add Article to Path Request
 */
export interface AddArticleToPathRequest {
  article_id: string;
  display_order?: number;
  is_required?: boolean;
  section?: string | null; // Section name within the path
}

/**
 * Reorder Path Articles Request
 */
export interface ReorderPathArticlesRequest {
  articles: Array<{
    id: string;
    display_order: number;
  }>;
}

/**
 * API Response Wrappers
 */
export interface PathsListResponse {
  status: 'ok';
  paths: Path[];
  total?: number;
}

export interface PathResponse {
  status: 'ok';
  path: Path;
}

export interface ArticlesListResponse {
  status: 'ok';
  articles: Article[];
  total?: number;
}

export interface ArticleResponse {
  status: 'ok';
  article: Article;
}

export interface PathArticlesListResponse {
  status: 'ok';
  articles: PathArticle[];
  total?: number;
}

export interface FileUploadResponse {
  status: 'ok';
  file_url: string;
  file_name: string;
  file_size: number;
}

// =====================================================
// UI-SPECIFIC TYPES
// =====================================================

/**
 * Path Card Props (for main listing page)
 */
export interface PathCardProps {
  path: Path;
  onClick: () => void;
  canManage?: boolean;
}

/**
 * Article List Item Props (for sidebar)
 */
export interface ArticleListItemProps {
  article: PathArticle;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

/**
 * Article Content Props (for viewing)
 */
export interface ArticleContentProps {
  article: Article;
  isCompleted: boolean;
  onToggleComplete: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Progress indicator state
 */
export interface ProgressState {
  total: number;
  completed: number;
  percentage: number;
}

// =====================================================
// VALIDATION RULES
// =====================================================

export const pathValidation = {
  title: {
    minLength: 3,
    maxLength: 200,
  },
  description: {
    maxLength: 2000,
  },
  icon: {
    maxLength: 50,
  },
  color: {
    pattern: /^#[0-9A-Fa-f]{6}$/, // hex color
  },
};

export const articleValidation = {
  title: {
    minLength: 3,
    maxLength: 200,
  },
  content: {
    minLength: 1,
    maxLength: 100000, // 100KB of HTML
  },
  tags: {
    maxCount: 10,
    maxTagLength: 30,
  },
};

// =====================================================
// PERMISSION HELPERS
// =====================================================

/**
 * Bible Permissions per role
 */
export interface BiblePermissions {
  canView: boolean;
  canCreatePaths: boolean;
  canEditPaths: boolean;
  canDeletePaths: boolean;
  canCreateArticles: boolean;
  canEditArticles: boolean;
  canDeleteArticles: boolean;
  canManagePaths: boolean;
}

/**
 * Get Bible permissions based on user role
 * All authenticated users can view content
 * Only admin/manager/team_leader can create/edit/delete
 */
export function getBiblePermissions(userRole: string): BiblePermissions {
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isLeader = userRole === 'leader';
  const canEdit = isAdmin || isManager || isLeader;

  return {
    canView: true, // All authenticated users can view
    canCreatePaths: canEdit,
    canEditPaths: canEdit,
    canDeletePaths: isAdmin || isManager, // Only admin/manager can delete
    canCreateArticles: canEdit,
    canEditArticles: canEdit,
    canDeleteArticles: isAdmin || isManager, // Only admin/manager can delete
    canManagePaths: canEdit,
  };
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export type {
  // Domain models
  Path,
  Article,
  PathArticle,
  UserProgress,

  // API types
  CreatePathRequest,
  UpdatePathRequest,
  CreateArticleRequest,
  UpdateArticleRequest,
  AddArticleToPathRequest,
  ReorderPathArticlesRequest,

  // Response types
  PathsListResponse,
  PathResponse,
  ArticlesListResponse,
  ArticleResponse,
  PathArticlesListResponse,
  FileUploadResponse,

  // UI types
  PathCardProps,
  ArticleListItemProps,
  ArticleContentProps,
  ProgressState,

  // Permission types
  BiblePermissions,
};
