import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

async function go() {
  const { data, error } = await supabase
    .from('transactions')
    .select('count', { count: 'exact' })

  console.log('Total transactions:', data, error)
  
  const { data: q2 } = await supabase.from('transactions').select('*').limit(5)
  console.log('Sample notes:', q2.map(i => i.notes))
}

go()
