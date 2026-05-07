import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAuth() {
  console.log('Signing up user...');
  
  // Try to sign in first
  let { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'criszimn@gmail.com',
    password: 'Cr1$Z_8812'
  });

  if (signInError || !user) {
    console.log('User not found or error, signing up instead...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'criszimn@gmail.com',
      password: 'Cr1$Z_8812'
    });
    
    if (signUpError) {
      console.error('Error signing up:', signUpError);
      return;
    }
    user = signUpData.user;
  }

  if (!user) {
    console.error('Could not get user');
    return;
  }

  console.log('User ID:', user.id);
}

setupAuth().catch(console.error);
