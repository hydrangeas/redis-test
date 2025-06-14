import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

export type SupabaseClient = SupabaseClientType;

export { createClient };