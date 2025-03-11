import { SupabaseClient, createClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      _health: {
        Row: {
          id: number;
          status: string;
          timestamp: string;
        };
        Insert: {
          status: string;
          timestamp?: string;
        };
        Update: {
          status?: string;
          timestamp?: string;
        };
      };
      // Add other tables here as needed
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type SupabaseClientType = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  // Add your database types here
  // Example:
  // users: {
  //   Row: {
  //     id: string;
  //     email: string;
  //     created_at: string;
  //   };
  //   Insert: {
  //     email: string;
  //   };
  //   Update: {
  //     email?: string;
  //   };
  // };
}

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
} 