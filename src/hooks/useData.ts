import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keys } from '../lib/queryClient'
import type { PropertyMetrics, MonthlySummary, Transaction, TransactionFilters, AmortizationRow, Lease, AutoPostRule, Tag } from '../lib/types'
import { currentMonth } from '../lib/utils'

// ── METRICS ──────────────────────────────────────────────────────────────────
export function useMetrics(propertyId: string | null) {
  return useQuery({
    queryKey: keys.metrics(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_property_metrics', { p_property_id: propertyId })
      if (error) throw error
      return data as PropertyMetrics
    },
    enabled: !!propertyId,
  })
}

// ── MONTHLY SUMMARY ───────────────────────────────────────────────────────────
export function useMonthlySummary(propertyId: string | null) {
  return useQuery({
    queryKey: keys.monthly(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_monthly_summary')
        .select('*')
        .eq('property_id', propertyId)
        .order('month', { ascending: true })
      if (error) throw error
      return data as MonthlySummary[]
    },
    enabled: !!propertyId,
  })
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
export function useTransactions(propertyId: string | null, filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: keys.transactions(propertyId ?? '', filters as Record<string, unknown>),
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.month) {
        const [yy, mm] = filters.month.split('-')
        const start = `${filters.month}-01`
        // Date(yyyy, mm, 0) gives the last day of the previous month. Since mm is 1-indexed here natively, 
        // passing mm unmodified perfectly yields the last day of the target month!
        const lastDay = new Date(Number(yy), Number(mm), 0).getDate()
        const end   = `${filters.month}-${lastDay}`
        q = q.gte('date', start).lte('date', end)
      }
      if (filters.date_from) q = q.gte('date', filters.date_from)
      if (filters.date_to)   q = q.lte('date', filters.date_to)
      if (filters.tag_name)  q = q.eq('tag_name', filters.tag_name)
      if (filters.tags && filters.tags.length > 0) q = q.in('tag_name', filters.tags)
      if (filters.search)    q = q.ilike('notes', `%${filters.search}%`)

      const { data, error } = await q
      if (error) throw error
      return data as Transaction[]
    },
    enabled: !!propertyId,
  })
}

export function useCurrentMonthTransactions(propertyId: string | null) {
  return useTransactions(propertyId, { month: currentMonth() })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, 'id' | 'created_at' | 'created_by' | 'is_auto_posted' | 'auto_post_rule_id' | 'amortization_id' | 'breakdown'>) => {
      const { error } = await supabase.from('transactions').insert(tx)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.transactions(vars.property_id) })
      qc.invalidateQueries({ queryKey: keys.metrics(vars.property_id) })
      qc.invalidateQueries({ queryKey: keys.monthly(vars.property_id) })
    },
  })
}

// ── AMORTIZATION ──────────────────────────────────────────────────────────────
export function useAmortization(propertyId: string | null) {
  return useQuery({
    queryKey: keys.amortization(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amortization_schedule')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_number', { ascending: true })
      if (error) throw error
      return data as AmortizationRow[]
    },
    enabled: !!propertyId,
  })
}

export function useCurrentAmortizationRow(propertyId: string | null) {
  const { data: rows } = useAmortization(propertyId)
  const now = new Date()
  return rows?.find(r => {
    const d = new Date(r.payment_date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }) ?? null
}

export function useUpdateAmortizationRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, propertyId, patch }: {
      id: string
      propertyId: string
      patch: Partial<AmortizationRow>
    }) => {
      const { error } = await supabase
        .from('amortization_schedule')
        .update({ ...patch, edited_by_user: true })
        .eq('id', id)
      if (error) throw error
      return propertyId
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.amortization(vars.propertyId) })
      qc.invalidateQueries({ queryKey: keys.metrics(vars.propertyId) })
    },
  })
}

// ── LEASES ────────────────────────────────────────────────────────────────────
export function useLeases(propertyId: string | null) {
  return useQuery({
    queryKey: keys.leases(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select('*')
        .eq('property_id', propertyId)
        .order('lease_start', { ascending: false })
      if (error) throw error
      return data as Lease[]
    },
    enabled: !!propertyId,
  })
}

export function useActiveLease(propertyId: string | null) {
  const { data: leases } = useLeases(propertyId)
  const today = new Date().toISOString().split('T')[0]
  return leases?.find(l => l.lease_start <= today && l.lease_end >= today) ?? null
}

// ── AUTO-POST RULES ───────────────────────────────────────────────────────────
export function useAutoPostRules(propertyId: string | null) {
  return useQuery({
    queryKey: keys.autoPostRules(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_post_rules')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as AutoPostRule[]
    },
    enabled: !!propertyId,
  })
}

export function useDeleteAutoPostRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('auto_post_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-post-rules'] })
    },
  })
}

export function useAddAutoPostRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rule: Omit<AutoPostRule, 'id' | 'created_at' | 'created_by'>) => {
      const { error } = await supabase.from('auto_post_rules').insert(rule)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.autoPostRules(vars.property_id) })
    },
  })
}

export function useUpdateAutoPostRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string, patch: Partial<AutoPostRule> }) => {
      const { error } = await supabase.from('auto_post_rules').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, _vars) => {
      // We don't have the property_id here easily, so we invalidate all rule queries
      qc.invalidateQueries({ queryKey: ['auto-post-rules'] })
    },
  })
}

// ── TAGS ──────────────────────────────────────────────────────────────────────
export function useTags(propertyId: string | null) {
  return useQuery({
    queryKey: keys.tags(propertyId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('property_id', propertyId)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data as Tag[]
    },
    enabled: !!propertyId,
  })
}

// ── UPDATE PROPERTY VALUE ─────────────────────────────────────────────────────
export function useUpdatePropertyValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ propertyId, value }: { propertyId: string; value: number }) => {
      const { error } = await supabase
        .from('properties')
        .update({ current_value: value, current_value_updated_at: new Date().toISOString() })
        .eq('id', propertyId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.property(vars.propertyId) })
      qc.invalidateQueries({ queryKey: keys.metrics(vars.propertyId) })
    },
  })
}
