import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database, SupabaseClientType, SupabaseConfig } from '../types/supabase.js';

// Load environment variables if not already loaded
dotenv.config();

class SupabaseService {
  private static instance: SupabaseService;
  private config: SupabaseConfig;
  private _client: SupabaseClientType | null = null;
  private _adminClient: SupabaseClientType | null = null;

  private constructor() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      throw new Error(
        'Missing required Supabase environment variables. Please check your .env file.'
      );
    }

    this.config = {
      url,
      anonKey,
      serviceRoleKey,
    };
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public get client(): SupabaseClientType {
    if (!this._client) {
      this._client = createClient<Database>(
        this.config.url,
        this.config.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
          },
        }
      );
    }
    return this._client;
  }

  public get adminClient(): SupabaseClientType {
    if (!this._adminClient) {
      if (!this.config.serviceRoleKey) {
        throw new Error('Service role key is required for admin client');
      }

      this._adminClient = createClient<Database>(
        this.config.url,
        this.config.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return this._adminClient;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('_health')
        .select('*')
        .limit(1)
        .single();
      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabaseService = SupabaseService.getInstance();
export const supabase = supabaseService.client;
export const supabaseAdmin = supabaseService.adminClient; 