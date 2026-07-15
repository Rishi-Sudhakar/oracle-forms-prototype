import { useState, useCallback } from 'react'

const KEY = 'ords_base'

export function useOrds() {
  const [base, setBase] = useState<string>(() => localStorage.getItem(KEY) ?? '')

  const save = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, '')
    localStorage.setItem(KEY, clean)
    setBase(clean)
  }, [])

  return { base, save, configured: base.length > 0 }
}
