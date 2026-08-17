'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PortsAirportsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({
    un_locode: '', iata_code: '', name: '', city: '', country_code: '', location_type: 'port', is_active: true,
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Select all / delete
  const [selected, setSelected] = useState<string[]>([])

  const LOCATION_TYPES = [
    { value: 'port', label: 'Porto' },
    { value: 'airport', label: 'Aeroporto' },
    { value: 'terminal', label: 'Terminal' },
    { value: 'inland_depot', label: 'Depósito Interior' },
  ]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { router.push('/'); return }
    setProfile(p)

    const { data: pa } = await supabase
      .from('ports_airports')
      .select('*')
      .order('country_code')
      .order('name')
    setItems(pa ?? [])

    setLoading(false)
  }

  function openNew() {
    setEditItem(null)
    setForm({ un_locode: '', iata_code: '', name: '', city: '', country_code: '', location_type: 'port', is_active: true })
    setMsg('')
    setShowForm(true)
  }

  function openEdit(item: any) {
    setEditItem(item)
    setForm({
      un_locode:     item.un_locode     ?? '',
      iata_code:     item.iata_code     ?? '',
      name:          item.name          ?? '',
      city:          item.city          ?? '',
      country_code:  item.country_code  ?? '',
      location_type: item.location_type ?? 'port',
      is_active:     item.is_active     ?? true,
    })
    setMsg('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const payload = {
      un_locode:     form.un_locode ? form.un_locode.toUpperCase() : null,
      iata_code:     form.iata_code ? form.iata_code.toUpperCase() : null,
      name:          form.name,
      city:          form.city,
      country_code:  form.country_code ? form.country_code.toUpperCase() : null,
      location_type: form.location_type,
      is_active:     form.is_active,
    }

    if (editItem) {
      const { error } = await supabase.from('ports_airports').update(payload).eq('id', editItem.id)
      if (error) { setMsg('Erro ao salvar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('ports_airports').insert(payload)
      if (error) { setMsg('Erro ao salvar: ' + error.message); setSaving(false); return }
    }

    setMsg('Salvo!')
    await loadData()
    setTimeout(() => setShowForm(false), 800)
    setSaving(false)
  }

  async function deleteSelected() {
    if (!selected.length) return
    if (!confirm(`Excluir ${selected.length} registro(s)?`)) return
    await supabase.from('ports_airports').delete().in('id', selected)
    setSelected([])
    await loadData()
  }

  async function deleteAll() {
    if (!confirm('Excluir TODOS os portos e aeroportos? Esta ação não pode ser desfeita.')) return
    await supabase.from('ports_airports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setSelected([])
    await loadData()
  }

  const countries = Array.from(new Set(items.map(i => i.country_code).filter(Boolean))).sort()

  const filteredItems = items.filter(i => {
    const matchSearch = !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.city?.toLowerCase().includes(search.toLowerCase()) ||
      i.un_locode?.toLowerCase().includes(search.toLowerCase()) ||
      i.iata_code?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || i.location_type === filterType
    const matchCountry = !filterCountry || i.country_code === filterCountry
    const matchStatus = !filterStatus || (filterStatus === 'active' ? i.is_active : !i.is_active)
    return matchSearch && matchType && matchCountry && matchStatus
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Portos e Aeroportos</span>
        </div>
        <button onClick={() => router.push('/cadastros')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Portos e Aeroportos ({items.length})</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 flex-wrap">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nome, cidade, UN/LOCODE, IATA..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-72"/>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todos os Tipos</option>
              {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todos os Países</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <div className="flex gap-2">
            {selected.length > 0 && (
              <button onClick={deleteSelected}
                className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg transition">
                Excluir Selecionados ({selected.length})
              </button>
            )}
            {profile?.role === 'admin' && (
              <button onClick={deleteAll}
                className="text-sm text-red-400 hover:text-red-600 border border-red-100 px-3 py-2 rounded-lg transition">
                Limpar Tudo
              </button>
            )}
            <button onClick={openNew}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition">
              + Novo
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3">
                  <input type="checkbox"
                    checked={selected.length === filteredItems.length && filteredItems.length > 0}
                    onChange={e => setSelected(e.target.checked ? filteredItems.map(i => i.id) : [])}/>
                </th>
                <th className="px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Nome</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Cidade</th>
                <th className="px-4 py-3 text-gray-500 font-medium">País</th>
                <th className="px-4 py-3 text-gray-500 font-medium">UN/LOCODE</th>
                <th className="px-4 py-3 text-gray-500 font-medium">IATA</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(i => (
                <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <input type="checkbox"
                      checked={selected.includes(i.id)}
                      onChange={e => setSelected(e.target.checked ? [...selected, i.id] : selected.filter(x => x !== i.id))}/>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      i.location_type === 'port' ? 'bg-blue-100 text-blue-700' :
                      i.location_type === 'airport' ? 'bg-purple-100 text-purple-700' :
                      i.location_type === 'terminal' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{LOCATION_TYPES.find(t => t.value === i.location_type)?.label || i.location_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{i.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{i.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{i.country_code || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.un_locode || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.iata_code || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${i.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {i.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(i)} className="text-xs text-gray-500 hover:text-gray-900 transition">Editar</button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredItems.length} de {items.length} registros</p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{editItem ? 'Editar' : 'Novo'} Porto/Aeroporto</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                  <select value={form.location_type} onChange={e => setForm({...form, location_type: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">País (código, ex: BR)</label>
                  <input type="text" maxLength={2} value={form.country_code} onChange={e => setForm({...form, country_code: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cidade *</label>
                  <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">UN/LOCODE</label>
                  <input type="text" maxLength={5} value={form.un_locode} onChange={e => setForm({...form, un_locode: e.target.value})}
                    placeholder="ex: BRSSZ"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código IATA</label>
                  <input type="text" maxLength={3} value={form.iata_code} onChange={e => setForm({...form, iata_code: e.target.value})}
                    placeholder="ex: GRU"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase"/>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button"
                    onClick={() => setForm({...form, is_active: !form.is_active})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                  <span className="text-sm text-gray-700">{form.is_active ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
              {msg && <p className={`text-sm ${msg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Salvando...' : editItem ? 'Salvar Alterações' : 'Criar Registro'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
