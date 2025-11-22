import { SupabaseClient } from '@supabase/supabase-js';
import { createGuestAccount } from '@/app/actions';

export async function signInAsGuest(supabase: SupabaseClient) {
  try {
    // 1. Try Anonymous Sign In first
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    
    if (!anonError && anonData.session) {
      console.log('Signed in anonymously');
      return { user: anonData.user, error: null };
    }

    console.warn('Anonymous auth failed, falling back to server-side guest creation:', anonError?.message);

    // 2. Fallback: Create guest account via Server Action (bypasses CAPTCHA)
    try {
      const { email, password } = await createGuestAccount();
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Guest sign-in failed:', signInError);
        return { user: null, error: signInError };
      }

      console.log('Signed in via guest email fallback');
      return { user: signInData.user, error: null };

    } catch (serverError: any) {
      console.error('Server-side guest creation failed:', serverError);
      return { user: null, error: serverError };
    }

  } catch (err: any) {
    console.error('Auth error:', err);
    return { user: null, error: err };
  }
}
