'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CustomsFacilitiesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({
    legal_name: '', trade_name: '', cnpj: '', facility_code: '', facility_type: '',
    address_street: '', address_number: '', address_complement: '', address_neighborhood: '',
    address_city: '', address_state: '', address_country: 'BRASIL', is_active: true, notes: '',
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Contacts (only available when editing an existing facility)
  const [contacts, setContacts] = useState<any[]>([])
  const [contactForm, setContactForm] = useState({ name: '', role: '', phone: '', email: '', is_primary: false })
  const [contactMsg, setContactMsg] = useState('')

  // Select all / delete
  const [selected, setSelected] = useState<string[]>([])

  const FACILITY_TYPES = ['CLIA', 'Terminal Portuário', 'Terminal de Carga Aérea', 'EADI / Porto Seco', 'Armazém Alfandegado', 'Redex', 'Outro']

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { router.push('/'); return }
    setProfile(p)

    const { data: cf } = await supabase
      .from('customs_facilities')
      .select('*')
      .order('address_city')
      .order('legal_name')
    setItems(cf ?? [])

    setLoading(false)
  }

  async function loadContacts(facilityId: string) {
    const { data } = await supabase
      .from('customs_facility_contacts')
      .select('*')
      .eq('customs_facility_id', facilityId)
      .order('is_primary', { ascending: false })
      .order('name')
    setContacts(data ?? [])
  }

  function openNew() {
    setEditItem(null)
    setForm({
      legal_name: '', trade_name: '', cnpj: '', facility_code: '', facility_type: '',
      address_street: '', address_number: '', address_complement: '', address_neighborhood: '',
      address_city: '', address_state: '', address_country: 'BRASIL', is_active: true, notes: '',
    })
    setContacts([])
    setContactForm({ name: '', role: '', phone: '', email: '', is_primary: false })
    setMsg('')
    setShowForm(true)
  }

  async function openEdit(item: any) {
    setEditItem(item)
    setForm({
      legal_name:            item.legal_name            ?? '',
      trade_name:            item.trade_name             ?? '',
      cnpj:                  item.cnpj                   ?? '',
      facility_code:         item.facility_code          ?? '',
      facility_type:         item.facility_type          ?? '',
      address_street:        item.address_street         ?? '',
      address_number:        item.address_number         ?? '',
      address_complement:    item.address_complement     ?? '',
      address_neighborhood:  item.address_neighborhood   ?? '',
      address_city:          item.address_city           ?? '',
      address_state:         item.address_state          ?? '',
      address_country:       item.address_country         || 'BRASIL',
      is_active:             item.is_active               ?? true,
      notes:                 item.notes                  ?? '',
    })
    setContactForm({ name: '', role: '', phone: '', email: '', is_primary: false })
    setMsg('')
    setShowForm(true)
    await loadContacts(item.id)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const payload = {
      legal_name:           form.legal_name,
      trade_name:           form.trade_name           || null,
      cnpj:                 form.cnpj                 || null,
      facility_code:        form.facility_code        || null,
      facility_type:        form.facility_type        || null,
      address_street:       form.address_street       || null,
      address_number:       form.address_number       || null,
      address_complement:   form.address_complement   || null,
      address_neighborhood: form.address_neighborhood || null,
      address_city:         form.address_city         || null,
      address_state:        form.address_state        || null,
      address_country:      form.address_country      || 'BRASIL',
      is_active:            form.is_active,
      notes:                form.notes                || null,
    }

    if (editItem) {
      const { error } = await supabase.from('customs_facilities').update(payload).eq('id', editItem.id)
      if (error) { setMsg('Erro ao salvar: ' + error.message); setSaving(false); return }
      setMsg('Salvo!')
      await loadData()
      setSaving(false)
    } else {
      const { data, error } = await supabase.from('customs_facilities').insert(payload).select().single()
      if (error) { setMsg('Erro ao salvar: ' + error.message); setSaving(false); return }
      setMsg('Recinto criado! Agora você pode adicionar contatos abaixo.')
      setEditItem(data)
      await loadData()
      await loadContacts(data.id)
      setSaving(false)
    }
  }

  async function handleAddContact() {
    if (!editItem) return
    if (!contactForm.name.trim()) { setContactMsg('Informe o nome do contato'); return }
    setContactMsg('')
    const { error } = await supabase.from('customs_facility_contacts').insert({
      customs_facility_id: editItem.id,
      name: contactForm.name,
      role: contactForm.role || null,
      phone: contactForm.phone || null,
      email: contactForm.email || null,
      is_primary: contactForm.is_primary,
    })
    if (error) { setContactMsg('Erro ao adicionar contato: ' + error.message); return }
    setContactForm({ name: '', role: '', phone: '', email: '', is_primary: false })
    await loadContacts(editItem.id)
  }

  async function handleRemoveContact(contactId: string) {
    if (!confirm('Remover este contato?')) return
    await supabase.from('customs_facility_contacts').delete().eq('id', contactId)
    if (editItem) await loadContacts(editItem.id)
  }

  async function deleteSelected() {
    if (!selected.length) return
    if (!confirm(`Excluir ${selected.length} recinto(s)? Os contatos vinculados também serão removidos.`)) return
    await supabase.from('customs_facilities').delete().in('id', selected)
    setSelected([])
    await loadData()
  }

  async function deleteAll() {
    if (!confirm('Excluir TODOS os recintos alfandegados? Esta ação não pode ser desfeita.')) return
    await supabase.from('customs_facilities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setSelected([])
    await loadData()
  }

  const cities = Array.from(new Set(items.map(i => i.address_city).filter(Boolean))).sort()

  const filteredItems = items.filter(i => {
    const matchSearch = !search ||
      i.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.trade_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.cnpj?.includes(search) ||
      i.facility_code?.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || i.facility_type === filterType
    const matchCity = !filterCity || i.address_city === filterCity
    const matchStatus = !filterStatus || (filterStatus === 'active' ? i.is_active : !i.is_active)
    return matchSearch && matchType && matchCity && matchStatus
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
          <span className="text-sm text-gray-500">Recintos Alfandegados</span>
        </div>
        <button onClick={() => router.push('/cadastros')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Recintos Alfandegados ({items.length})</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 flex-wrap">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar razão social, fantasia, CNPJ, código..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-80"/>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todos os Tipos</option>
              {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todas as Cidades</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
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
                <th className="px-4 py-3 text-gray-500 font-medium">Nome Fantasia</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Razão Social</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Cidade</th>
                <th className="px-4 py-3 text-gray-500 font-medium">CNPJ</th>
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
                  <td className="px-4 py-3 text-gray-900">{i.trade_name || i.legal_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{i.legal_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">{i.facility_type || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{i.address_city || '—'}{i.address_state ? ` / ${i.address_state}` : ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.cnpj || '—'}</td>
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredItems.length} de {items.length} registros</p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{editItem ? 'Editar' : 'Novo'} Recinto Alfandegado</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Razão Social *</label>
                  <input type="text" value={form.legal_name} onChange={e => setForm({...form, legal_name: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome Fantasia</label>
                  <input type="text" value={form.trade_name} onChange={e => setForm({...form, trade_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.facility_type} onChange={e => setForm({...form, facility_type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
                  <input type="text" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código do Recinto</label>
                  <input type="text" value={form.facility_code} onChange={e => setForm({...form, facility_code: e.target.value})}
                    placeholder="ex: 8933203"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Endereço</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rua</label>
                  <input type="text" value={form.address_street} onChange={e => setForm({...form, address_street: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                  <input type="text" value={form.address_number} onChange={e => setForm({...form, address_number: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                  <input type="text" value={form.address_complement} onChange={e => setForm({...form, address_complement: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                  <input type="text" value={form.address_neighborhood} onChange={e => setForm({...form, address_neighborhood: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                  <input type="text" value={form.address_city} onChange={e => setForm({...form, address_city: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <input type="text" maxLength={2} value={form.address_state} onChange={e => setForm({...form, address_state: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
                  <input type="text" value={form.address_country} onChange={e => setForm({...form, address_country: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
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
                  {saving ? 'Salvando...' : editItem ? 'Salvar Alterações' : 'Criar Recinto'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                  Fechar
                </button>
              </div>
            </form>

            {/* Contacts section - only for existing facilities */}
            {editItem && (
              <div className="border-t border-gray-100 mt-6 pt-6">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Contatos</p>

                {contacts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {contacts.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="text-gray-900 font-medium">{c.name}</span>
                          {c.is_primary && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700">Principal</span>}
                          <span className="text-gray-500 text-xs ml-2">{c.role || ''}</span>
                          <div className="text-xs text-gray-400">{c.phone || '—'} {c.email ? `· ${c.email}` : ''}</div>
                        </div>
                        <button onClick={() => handleRemoveContact(c.id)} className="text-xs text-red-400 hover:text-red-600 transition">Remover</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}
                    placeholder="Nome *"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <input type="text" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})}
                    placeholder="Cargo/Função"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <input type="text" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                    placeholder="Telefone"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  <input type="text" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}
                    placeholder="E-mail"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={contactForm.is_primary}
                      onChange={e => setContactForm({...contactForm, is_primary: e.target.checked})}/>
                    Contato principal
                  </label>
                  <button type="button" onClick={handleAddContact}
                    className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                    + Adicionar Contato
                  </button>
                </div>
                {contactMsg && <p className="text-sm text-red-500 mt-2">{contactMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
