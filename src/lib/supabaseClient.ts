import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kbennympprzygybdcujp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZW5ueW1wcHJ6eWd5YmRjdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjI1MTAsImV4cCI6MjA5MzczODUxMH0.Uq_gwM93nAgovzLf7VJIruw0BRzbaKS6rGBWtTW1qjk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
