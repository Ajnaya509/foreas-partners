'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Euro, TrendingUp, Copy, Check, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Partner {
  id: string
  company_name: string
  contact_email: string
  referral_code: string
  total_earned: number
}

interface Driver {
  first_name: string
  last_name: string
  total_rides: number
  total_earnings: number
  created_at: string
}

interface Referral {
  id: string
  partner_id: string
  signup_date: string
  subscription_status: string
  drivers: Driver
}

export default function Dashboard() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    monthlyEarnings: 0,
    totalEarnings: 0
  })
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadPartnerData()
  }, [])

  const loadPartnerData = async () => {
    // Récupérer l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Charger les données partenaire
    const { data: partnerData } = await supabase
      .from('partners')
      .select('*')
      .eq('contact_email', user.email)
      .single()

    if (partnerData) {
      setPartner(partnerData)

      // Charger les filleuls
      const { data: referralData } = await supabase
        .from('partner_referrals')
        .select(`
          *,
          drivers (
            first_name,
            last_name,
            total_rides,
            total_earnings,
            created_at
          )
        `)
        .eq('partner_id', partnerData.id)

      setReferrals(referralData || [])

      // Calculer les stats
      const active = referralData?.filter(r => r.subscription_status === 'active').length || 0
      setStats({
        totalDrivers: referralData?.length || 0,
        activeDrivers: active,
        monthlyEarnings: active * 10, // 10€ par chauffeur actif
        totalEarnings: partnerData?.total_earned || 0
      })
    }
  }

  const copyReferralLink = () => {
    const link = `https://app.foreas.com/signup?ref=${partner?.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Données pour le graphique
  const chartData = [
    { month: 'Jan', earnings: 120 },
    { month: 'Fév', earnings: 180 },
    { month: 'Mar', earnings: 240 },
    { month: 'Avr', earnings: 300 },
    { month: 'Mai', earnings: 380 },
    { month: 'Juin', earnings: 450 }
  ]

  if (!partner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900">
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Bonjour {partner?.company_name} 👋
            </h1>
            <p className="text-white/60">Voici vos performances en temps réel</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-blue-400" size={24} />
              <span className="text-green-400 text-sm">+12%</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalDrivers}</div>
            <div className="text-white/60 text-sm">Chauffeurs référés</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-green-400" size={24} />
              <span className="text-green-400 text-sm">+8%</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.activeDrivers}</div>
            <div className="text-white/60 text-sm">Actifs ce mois</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <Euro className="text-purple-400" size={24} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.monthlyEarnings}€</div>
            <div className="text-white/60 text-sm">Ce mois</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <Euro className="text-yellow-400" size={24} />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalEarnings}€</div>
            <div className="text-white/60 text-sm">Total gagné</div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Votre lien de parrainage</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={`https://app.foreas.com/signup?ref=${partner?.referral_code}`}
              readOnly
              className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none text-sm"
            />
            <button
              onClick={copyReferralLink}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? 'Copié!' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Évolution des revenus</h2>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="earnings" stroke="#8B5CF6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Vos chauffeurs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white min-w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-2">Nom</th>
                  <th className="text-left py-3 px-2">Date inscription</th>
                  <th className="text-left py-3 px-2">Statut</th>
                  <th className="text-left py-3 px-2">Courses</th>
                  <th className="text-left py-3 px-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-white/10">
                    <td className="py-3 px-2">
                      {ref.drivers?.first_name} {ref.drivers?.last_name}
                    </td>
                    <td className="py-3 px-2">
                      {new Date(ref.signup_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ref.subscription_status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {ref.subscription_status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-2">{ref.drivers?.total_rides || 0}</td>
                    <td className="py-3 px-2 font-semibold">10€/mois</td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/50">
                      Aucun chauffeur référé pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}