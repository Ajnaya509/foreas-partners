'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Vérifier si le partenaire existe
      const { data: partner } = await supabase
        .from('partners')
        .select('*')
        .eq('contact_email', email)
        .single()

      if (!partner) {
        alert('Compte partenaire non trouvé')
        setLoading(false)
        return
      }

      // Auth avec Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (!error) {
        router.push('/dashboard')
      } else {
        alert('Erreur de connexion: ' + error.message)
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Une erreur est survenue')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">FOREAS Partners</h1>
          <p className="text-white/60">Espace partenaires</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Connexion'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            Pas encore partenaire ? Contactez-nous
          </p>
        </div>
      </div>
    </div>
  )
}