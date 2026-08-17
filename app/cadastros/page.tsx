'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    { title: 'Cadastro Geral', description: 'Clientes, fornecedores, agentes, transportadoras e demais parceiros comerciais', href: '/clients', color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
    { title: 'Plano de Contas', description: 'Contas contábeis e centros de custo', href: '/chart-of-accounts', color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
    { title: 'Portos e Aeroportos', description: 'Cadastro de portos, aeroportos, terminais e depósitos', href: '/ports-airports', color: 'bg-cyan-50 border-cyan-100 hover:border-cyan-300' },
    { title: 'Recintos Alfandegados', description: 'CLIAs, terminais portuários, EADIs e armazéns alfandegados', href: '/customs-facilities', color: 'bg-orange-50 border-orange-100 hover:border-orange-300' },
    { title: 'Incoterms', description: 'Termos internacionais de comércio (EXW, FOB, CIF, DDP, etc.)', href: '/incoterms', color: 'bg-violet-50 border-violet-100 hover:border-violet-300' },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Cadastros</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Cadastros</h2>
        <p className="text-gray-500 text-sm mb-10">Dados mestres utilizados em todo o sistema.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(m => (
            <button
              key={m.href}
              onClick={() => router.push(m.href)}
              className={`text-left p-6 rounded-2xl border transition ${m.color}`}
            >
              <h3 className="font-semibold text-gray-900 mb-1">{m.title}</h3>
              <p className="text-sm text-gray-500">{m.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
