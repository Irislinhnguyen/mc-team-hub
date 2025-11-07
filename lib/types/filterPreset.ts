/**
 * Filter Preset Types
 *
 * Types for the saved filter presets feature that allows users to save,
 * load, and share filter configurations across analytics pages.
 */

import type { CrossFilter } from '../../app/contexts/CrossFilterContext';
import type { SimplifiedFilter } from './performanceTracker';

/**
 * Filter preset type classification
 */
export type FilterPresetType = 'standard' | 'advanced';

/**
 * Database representation of a filter preset
 */
export interface FilterPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  page: string; // e.g., 'daily-ops', 'deep-dive', 'publisher-summary'
  filters: Record<string, any>; // FilterPanel state (team, pic, product, date range, etc.)
  cross_filters: CrossFilter[]; // CrossFilter state
  simplified_filter?: SimplifiedFilter; // Simplified filter state (Looker Studio-style)
  filter_type: FilterPresetType; // Type of filter: 'standard' for regular presets, 'advanced' for advanced filter management
  advanced_filter_names?: string[]; // Names of advanced filters used in this preset
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;

  // Populated when fetching shared presets
  owner_email?: string;
  owner_name?: string;
  share_permission?: 'view' | 'edit';
}

/**
 * Sharing information for a preset
 */
export interface FilterPresetShare {
  id: string;
  preset_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;

  // Populated data
  shared_with_email?: string;
  shared_with_name?: string;
}

/**
 * Input for creating a new filter preset
 */
export interface CreateFilterPresetInput {
  name: string;
  description?: string;
  page: string;
  filters: Record<string, any>;
  cross_filters: CrossFilter[];
  simplified_filter?: SimplifiedFilter;
  filter_type?: FilterPresetType; // Defaults to 'standard' if not specified
  advanced_filter_names?: string[]; // Names of advanced filters in this preset
  is_default?: boolean;
}

/**
 * Input for updating an existing filter preset
 */
export interface UpdateFilterPresetInput {
  name?: string;
  description?: string;
  filters?: Record<string, any>;
  cross_filters?: CrossFilter[];
  simplified_filter?: SimplifiedFilter;
  filter_type?: FilterPresetType;
  advanced_filter_names?: string[];
  is_default?: boolean;
}

/**
 * Input for sharing a preset with another user
 */
export interface SharePresetInput {
  preset_id: string;
  shared_with_user_email: string;
  permission: 'view' | 'edit';
}

/**
 * Response from preset list API
 */
export interface FilterPresetListResponse {
  own_presets: FilterPreset[];
  shared_presets: FilterPreset[];
}

/**
 * Preset item for UI dropdowns
 */
export interface FilterPresetMenuItem {
  preset: FilterPreset;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * State for tracking preset changes
 */
export interface PresetState {
  loadedPreset: FilterPreset | null;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Valid analytics page identifiers
 */
export type AnalyticsPage =
  | 'daily-ops'
  | 'deep-dive'
  | 'publisher-summary'
  | 'business-health'
  | 'profit-projections'
  | 'sales-tracking'
  | 'publisher-health'
  | 'team-setup'
  | 'new-sales';

/**
 * Helper to check if a page identifier is valid
 */
export function isValidAnalyticsPage(page: string): page is AnalyticsPage {
  return [
    'daily-ops',
    'deep-dive',
    'publisher-summary',
    'business-health',
    'profit-projections',
    'sales-tracking',
    'publisher-health',
    'team-setup',
  ].includes(page);
}

/**
 * Get human-readable page name
 */
export function getPageDisplayName(page: AnalyticsPage): string {
  const names: Record<AnalyticsPage, string> = {
    'daily-ops': 'Daily Operations',
    'deep-dive': 'Deep Dive',
    'publisher-summary': 'Publisher Summary',
    'business-health': 'Business Health',
    'profit-projections': 'Profit Projections',
    'sales-tracking': 'Sales Tracking',
    'publisher-health': 'Publisher Health',
    'team-setup': 'Team Setup',
    'new-sales': 'New Sales',
  };
  return names[page] || page;
}
