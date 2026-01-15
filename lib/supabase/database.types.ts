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
          role: 'admin' | 'manager' | 'user'
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
          role?: 'admin' | 'manager' | 'user'
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
          role?: 'admin' | 'manager' | 'user'
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
