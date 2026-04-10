const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nfojmlumqcaawthfbpin.supabase.co'
const supabaseKey = 'sb_publishable_mHryKQmslbstPr6G6UK1Gw_VBQsNb9n'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Finding Other Expense tag...')
  const { data: tags } = await supabase.from('tags').select('id').eq('name', 'Other Expense')
  if (!tags || tags.length === 0) {
    console.error('Could not find Other Expense tag')
    return
  }
  const otherExpenseTagId = tags[0].id

  console.log('Updating transaction...')
  const { data, error } = await supabase
    .from('transactions')
    .update({ 
      tag_id: otherExpenseTagId,
      tag_name: 'Other Expense'
    })
    .match({ 
      amount: -245.00,
      tag_name: 'Leasing Fee'
    })
    .gte('date', '2025-10-01')
    .lte('date', '2025-10-31')

  if (error) {
    console.error('Update failed:', error)
  } else {
    console.log('Successfully updated photo expense to Other Expense.')
  }
}

run()
