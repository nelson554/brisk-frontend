'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileText, Tags } from 'lucide-react'
import { HubHeader, ModuleGrid } from '@/components/AppHeader'

export default function ComercialPage() {
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
    { key: 'proposals', label: 'Propostas', description: 'Criar e gerenciar propostas comerciais', icon: FileText, color: '#30d158', href: '/proposals' },
    { key: 'pricing', label: 'Pricing', description: 'Tabela de tarifas de frete por agente e rota', icon: Tags, color: '#32ade6', href: '/pricing' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#f2f2f7' }}>
      <HubHeader title="Comercial" subtitle="Propostas comerciais e processos de venda" backHref="/dashboard" backLabel="Dashboard" />

      <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto' }}>
        <ModuleGrid modules={modules} />
      </div>
    </main>
  )
}
