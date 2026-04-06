import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isOwner: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  const { data: profile } = useQuery({
    queryKey: keys.profile(),
    queryFn: async () => {
      if (!session) return null
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      return data as Profile | null
    },
    enabled: !!session,
  })

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile: profile ?? null,
      isOwner: profile?.role === 'owner',
      isLoading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
