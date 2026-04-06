import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

async function go() {
  console.log('Signing up guest2...')
  const { data, error } = await supabase.auth.signUp({
    email: 'guest2@clarksville.app',
    password: 'clarksville-guest'
  })
  
  if (error) console.error('Error:', error.message)
  else console.log('guest2 created! User:', data.user?.email)

  // Try to log in immediately with guest2
  const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
    email: 'guest2@clarksville.app',
    password: 'clarksville-guest'
  })
  
  if (e2) console.error('Sign in error:', e2.message)
  else console.log('Successfully signed in as guest2!')
}

go()
