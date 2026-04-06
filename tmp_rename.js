import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

async function renameProperty() {
  console.log('Logging in as admin...')
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'nik.agarwal98@gmail.com',
    password: 'clarksville-admin'
  })
  
  if (authErr) {
    console.error('Failed to log in:', authErr.message)
    return
  }

  console.log('Updating property name...')
  const { data, error } = await supabase
    .from('properties')
    .update({ address: '864 Moray Ln' })
    .ilike('address', '%864 Moray Drive%')
    .select()

  if (error) {
    console.error('Update failed:', error.message)
  } else {
    console.log('Success! Updated property:', data)
  }
}

renameProperty()
