import React, { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keys } from '../lib/queryClient'
import type { Property } from '../lib/types'

interface PropertyContextValue {
  properties: Property[]
  activeProperty: Property | null
  activePropertyId: string | null
  setActivePropertyId: (id: string) => void
  isLoading: boolean
}

const PropertyContext = createContext<PropertyContextValue>({} as PropertyContextValue)

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null)

  const { data: properties = [] as Property[], isLoading } = useQuery({
    queryKey: keys.properties(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Property[]
    },
  })

  // Auto-select first property when list loads
  if (properties.length > 0 && !activePropertyId) {
    setActivePropertyId(properties[0].id)
  }

  const activeProperty = (properties as Property[]).find((p: Property) => p.id === activePropertyId) ?? (properties as Property[])[0] ?? null

  return (
    <PropertyContext.Provider value={{
      properties,
      activeProperty,
      activePropertyId: activeProperty?.id ?? null,
      setActivePropertyId,
      isLoading,
    }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperty() { return useContext(PropertyContext) }
