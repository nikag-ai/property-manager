import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')

async function go() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or('amount.eq.245,amount.eq.-245')

  console.log(JSON.stringify(data, null, 2))
}

go()
