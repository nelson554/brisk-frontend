'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users2, Landmark, Anchor, Warehouse, Globe2 } from 'lucide-react'
import { HubHeader, ModuleGrid } from '@/components/AppHeader'

export default function CadastrosPage() {
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
    { key: 'clients', label: 'Cadastro Geral', description: 'Clientes, fornecedores, agentes, transportadoras e demais parceiros comerciais', icon: Users2, color: '#0071e3', href: '/clients' },
    { key: 'chart-of-accounts', label: 'Plano de Contas', description: 'Contas contábeis e centros de custo', icon: Landmark, color: '#30d158', href: '/chart-of-accounts' },
    { key: 'ports-airports', label: 'Portos e Aeroportos', description: 'Cadastro de portos, aeroportos, terminais e depósitos', icon: Anchor, color: '#32ade6', href: '/ports-airports' },
    { key: 'customs-facilities', label: 'Recintos Alfandegados', description: 'CLIAs, terminais portuários, EADIs e armazéns alfandegados', icon: Warehouse, color: '#ff9f0a', href: '/customs-facilities' },
    { key: 'incoterms', label: 'Incoterms', description: 'Termos internacionais de comércio (EXW, FOB, CIF, DDP, etc.)', icon: Globe2, color: '#bf5af2', href: '/incoterms' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#f2f2f7' }}>
      <HubHeader title="Cadastros" subtitle="Dados mestres utilizados em todo o sistema" backHref="/dashboard" backLabel="Dashboard" />

      <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto' }}>
        <ModuleGrid modules={modules} />
      </div>
    </main>
  )
}
