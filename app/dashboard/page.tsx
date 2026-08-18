'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Briefcase, Users, Clock } from 'lucide-react'
import { HubHeader, ModuleGrid } from '@/components/AppHeader'

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
    }
    load()
  }, [])

  const modules = [
    { key: 'cadastros', label: 'Cadastros', description: 'Clientes, fornecedores, agentes, plano de contas, portos, recintos, incoterms', icon: Building2, color: '#0071e3', href: '/cadastros', role: 'all' },
    { key: 'comercial', label: 'Comercial', description: 'Propostas comerciais e processos de venda', icon: Briefcase, color: '#30d158', href: '/comercial', role: 'all' },
    { key: 'users', label: 'Usuários', description: 'Gerenciar usuários e convites', icon: Users, color: '#bf5af2', href: '/users', role: 'admin' },
  ]

  const visibleModules = modules.filter(m => m.role === 'all' || profile?.role === m.role)
  const firstName = profile?.full_name ? capitalize(profile.full_name.split(' ')[0]) : ''

  return (
    <main style={{ minHeight: '100vh', background: '#f2f2f7' }}>
      <HubHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}!`}
        subtitle={`Bem-vindo ao painel Brisk System${profile?.role ? ` · ${capitalize(profile.role)}` : ''}`}
      />

      <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e8e93', marginBottom: 24 }}>
          <Clock style={{ width: 14, height: 14 }} />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 18 }}>
          Módulos
        </p>

        <ModuleGrid modules={visibleModules} />
      </div>
    </main>
  )
}
