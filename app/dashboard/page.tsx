'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const modules = [
    { title: 'User Management', description: 'Manage users and invitations', href: '/users', role: 'admin', color: 'bg-purple-50 border-purple-100 hover:border-purple-300' },
    { title: 'Clients', description: 'Manage client portfolio', href: '/clients', role: 'all', color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
    { title: 'Suppliers', description: 'Manage suppliers', href: '/suppliers', role: 'all', color: 'bg-green-50 border-green-100 hover:border-green-300' },
    { title: 'International Agents', description: 'Manage overseas agents', href: '/agents', role: 'all', color: 'bg-amber-50 border-amber-100 hover:border-amber-300' },
  ]

  const visibleModules = modules.filter(m => m.role === 'all' || profile?.role === m.role)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">Brisk System</h1>
        <div className="flex items-center gap-4">
          {profile && (
            <span className="text-sm text-gray-500">
              {profile.full_name} · <span className="capitalize">{profile.role}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-500 text-sm mb-10">Welcome to Brisk Freight Forwarder System.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleModules.map(m => (
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