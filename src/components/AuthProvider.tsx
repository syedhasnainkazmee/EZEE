'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  org_id: string | null
  notify_email: boolean
  avatar_url?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refetch: () => void
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refetch: () => {} })

const PUBLIC_PATHS = ['/login', '/setup', '/accept-invite']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Don't fetch for public routes or review links
    if (pathname.startsWith('/review/') || PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      setLoading(false)
      return
    }
    fetchUser()
  }, [fetchUser, pathname])

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
