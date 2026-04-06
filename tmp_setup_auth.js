import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

async function setup() {
  console.log('1. Setting up guest user...')
  const { data: gData, error: gErr } = await supabase.auth.signUp({
    email: 'guest@clarksville.app',
    password: 'clarksville-guest'
  })
  if (gErr) console.error('Guest Error:', gErr.message)
  else console.log('Guest OK:', gData.user?.email)

  // Wait 1s
  await new Promise(r => setTimeout(r, 1000))

  console.log('2. Logging into Admin user securely...')
  const { data: aData, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'nik.agarwal98@gmail.com',
    password: 'password123'
  })
  
  if (aErr) {
    if (aErr.message.includes('Invalid login credentials')) {
       console.log('Maybe already changed? Testing clarksville-admin...')
       const { error: aErr2 } = await supabase.auth.signInWithPassword({
          email: 'nik.agarwal98@gmail.com',
          password: 'clarksville-admin'
        })
       if (!aErr2) console.log('Admin already using clarksville-admin!')
    } else {
       console.error('Admin Login Error:', aErr.message)
    }
  } else {
    console.log('Logged in. 3. Changing Admin password...')
    const { error: pErr } = await supabase.auth.updateUser({
      password: 'clarksville-admin'
    })
    if (pErr) console.error('Admin Password Update Error:', pErr.message)
    else console.log('Admin password updated successfully!')
  }
}

setup()
