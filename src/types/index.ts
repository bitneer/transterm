import { Database } from './supabase';

export type TermWithTranslations =
  Database['public']['Tables']['Term']['Row'] & {
    Translation: Database['public']['Tables']['Translation']['Row'][];
  };
