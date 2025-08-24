'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers login
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-4xl font-bold mb-4">FOREAS Partners</h1>
        <p className="text-white/60">Redirection en cours...</p>
      </div>
    </div>
  )
}