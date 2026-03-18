/**
 * Database Types from Supabase
 * Generated types for team management tables
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          name: string
          avatar_url: string | null
          role: 'admin' | 'manager' | 'leader' | 'user'
          auth_method: 'google' | 'password' | 'both'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          name: string
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'leader' | 'user'
          auth_method?: 'google' | 'password' | 'both'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          name?: string
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'leader' | 'user'
          auth_method?: 'google' | 'password' | 'both'
          created_at?: string
          updated_at?: string
        }
      }
      filter_presets: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          page: string
          filters: Record<string, any>
          cross_filters: any[] | null
          is_default: boolean | null
          is_shared: boolean | null
          filter_type: 'standard' | 'advanced' | 'deep_dive'
          simplified_filter: Record<string, any> | null
          advanced_filter_names: string[]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          page: string
          filters?: Record<string, any>
          cross_filters?: any[] | null
          is_default?: boolean | null
          is_shared?: boolean | null
          filter_type?: 'standard' | 'advanced' | 'deep_dive'
          simplified_filter?: Record<string, any> | null
          advanced_filter_names?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          page?: string
          filters?: Record<string, any>
          cross_filters?: any[] | null
          is_default?: boolean | null
          is_shared?: boolean | null
          filter_type?: 'standard' | 'advanced' | 'deep_dive'
          simplified_filter?: Record<string, any> | null
          advanced_filter_names?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
      }
      filter_preset_shares: {
        Row: {
          id: string
          preset_id: string
          shared_with_user_id: string
          permission: 'view' | 'edit'
          shared_by_user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          preset_id: string
          shared_with_user_id: string
          permission?: 'view' | 'edit'
          shared_by_user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          preset_id?: string
          shared_with_user_id?: string
          permission?: 'view' | 'edit'
          shared_by_user_id?: string
          created_at?: string | null
        }
      }
      team_configurations: {
        Row: {
          team_id: string
          team_name: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          team_id: string
          team_name: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          team_id?: string
          team_name?: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      team_pic_mappings: {
        Row: {
          mapping_id: string
          team_id: string
          pic_name: string
          pipeline_poc_name: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          mapping_id?: string
          team_id: string
          pic_name: string
          pipeline_poc_name?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          mapping_id?: string
          team_id?: string
          pic_name?: string
          pipeline_poc_name?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
      }
      team_product_patterns: {
        Row: {
          pattern_id: string
          team_id: string
          product_pattern: string
          pattern_type: string
          priority: number
          created_at: string
        }
        Insert: {
          pattern_id?: string
          team_id: string
          product_pattern: string
          pattern_type?: string
          priority?: number
          created_at?: string
        }
        Update: {
          pattern_id?: string
          team_id?: string
          product_pattern?: string
          pattern_type?: string
          priority?: number
          created_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          resource: string
          action: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          resource: string
          action: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          resource?: string
          action?: string
          description?: string | null
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: 'admin' | 'manager' | 'leader' | 'user'
          permission_id: string
          granted_at: string
        }
        Insert: {
          id?: string
          role: 'admin' | 'manager' | 'leader' | 'user'
          permission_id: string
          granted_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'manager' | 'leader' | 'user'
          permission_id?: string
        }
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          permission_id: string
          granted: boolean
          granted_by: string | null
          granted_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          permission_id: string
          granted?: boolean
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          permission_id?: string
          granted?: boolean
          granted_by?: string | null
          expires_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'urgent' | 'info' | 'success'
          category: 'challenge' | 'bible' | 'system' | 'team'
          title: string
          message: string
          data: Record<string, any> | null
          read_at: string | null
          dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'urgent' | 'info' | 'success'
          category: 'challenge' | 'bible' | 'system' | 'team'
          title: string
          message: string
          data?: Record<string, any> | null
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'urgent' | 'info' | 'success'
          category?: 'challenge' | 'bible' | 'system' | 'team'
          title?: string
          message?: string
          data?: Record<string, any> | null
          read_at?: string | null
          dismissed_at?: string | null
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_enabled: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          inapp_enabled: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          inapp_enabled?: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          inapp_enabled?: Record<'challenge' | 'bible' | 'system' | 'team', boolean>
          updated_at?: string
        }
      }
      notification_delivery_errors: {
        Row: {
          id: string
          notification_id: string | null
          error_type: string
          error_message: string | null
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: string
          notification_id?: string | null
          error_type: string
          error_message?: string | null
          retry_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          notification_id?: string | null
          error_type?: string
          error_message?: string | null
          retry_count?: number
        }
      }
    }
    Views: {
      [key: string]: {
        Row: any
      }
    }
    Functions: {
      [key: string]: {
        Args: any
        Returns: any
      }
    }
    Enums: {
      [key: string]: string
    }
    CompositeTypes: {
      [key: string]: any
    }
  }
}

// Helper types for database tables
export type User = Database["public"]["Tables"]["users"]["Row"]
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"]
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

export type FilterPreset = Database["public"]["Tables"]["filter_presets"]["Row"]
export type FilterPresetInsert = Database["public"]["Tables"]["filter_presets"]["Insert"]
export type FilterPresetUpdate = Database["public"]["Tables"]["filter_presets"]["Update"]

export type FilterPresetShare = Database["public"]["Tables"]["filter_preset_shares"]["Row"]
export type FilterPresetShareInsert = Database["public"]["Tables"]["filter_preset_shares"]["Insert"]
export type FilterPresetShareUpdate = Database["public"]["Tables"]["filter_preset_shares"]["Update"]

export type TeamConfiguration = Database["public"]["Tables"]["team_configurations"]["Row"]
export type TeamPicMapping = Database["public"]["Tables"]["team_pic_mappings"]["Row"]
export type TeamProductPattern = Database["public"]["Tables"]["team_product_patterns"]["Row"]

// RBAC Permission types
export type Permission = Database["public"]["Tables"]["permissions"]["Row"]
export type PermissionInsert = Database["public"]["Tables"]["permissions"]["Insert"]
export type PermissionUpdate = Database["public"]["Tables"]["permissions"]["Update"]

export type RolePermission = Database["public"]["Tables"]["role_permissions"]["Row"]
export type RolePermissionInsert = Database["public"]["Tables"]["role_permissions"]["Insert"]
export type RolePermissionUpdate = Database["public"]["Tables"]["role_permissions"]["Update"]

export type UserPermission = Database["public"]["Tables"]["user_permissions"]["Row"]
export type UserPermissionInsert = Database["public"]["Tables"]["user_permissions"]["Insert"]
export type UserPermissionUpdate = Database["public"]["Tables"]["user_permissions"]["Update"]

// Notification tables
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"]
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"]

export type NotificationPreference = Database["public"]["Tables"]["notification_preferences"]["Row"]
export type NotificationPreferenceInsert = Database["public"]["Tables"]["notification_preferences"]["Insert"]
export type NotificationPreferenceUpdate = Database["public"]["Tables"]["notification_preferences"]["Update"]

export type NotificationDeliveryError = Database["public"]["Tables"]["notification_delivery_errors"]["Row"]
export type NotificationDeliveryErrorInsert = Database["public"]["Tables"]["notification_delivery_errors"]["Insert"]
export type NotificationDeliveryErrorUpdate = Database["public"]["Tables"]["notification_delivery_errors"]["Update"]

// Helper types for notification system
export type NotificationType = 'urgent' | 'info' | 'success'
export type NotificationCategory = 'challenge' | 'bible' | 'system' | 'team'

export interface NotificationData {
  challenge_id?: string
  submission_id?: string
  grade_id?: string
  approval_id?: string
  [key: string]: any
}

export interface NotificationInput {
  user_id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: NotificationData
}

export interface UserNotificationPreferences {
  email: Record<NotificationCategory, boolean>
  inapp: Record<NotificationCategory, boolean>
}
