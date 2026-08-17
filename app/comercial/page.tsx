'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    { title: 'Propostas', description: 'Criar e gerenciar propostas comerciais', href: '/proposals', color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
    { title: 'Pricing', description: 'Tabela de tarifas de frete por agente e rota', href: '/pricing', color: 'bg-sky-50 border-sky-100 hover:border-sky-300' },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Comercial</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Comercial</h2>
        <p className="text-gray-500 text-sm mb-10">Propostas comerciais e processos de venda.</p>

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
