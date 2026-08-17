'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProposalsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // reference data
  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [shipmentTypes, setShipmentTypes] = useState<any[]>([])
  const [incoterms, setIncoterms] = useState<any[]>([])
  const [contactTypes, setContactTypes] = useState<any[]>([])

  // create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({
    client_id: '', opening_date: new Date().toISOString().slice(0, 10), inside_user_id: '',
    shipment_type_id: '', international_agent_id: '', deconsolidator_agent_id: '',
    commissioned_third_party_id: '', cargo_nature: '', has_insurance: false, insurer_id: '',
    incoterm_id: '', proposal_notes: '', client_notes: '',
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Rascunho', sent: 'Enviada', approved: 'Aprovada', rejected: 'Rejeitada', cancelled: 'Cancelada',
  }
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-red-50 text-red-400',
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { router.push('/'); return }
    setProfile(p)

    const { data: props } = await supabase
      .from('proposals')
      .select('*, client:clients!proposals_client_id_fkey(nickname, company_name), inside_user:profiles!proposals_inside_user_id_fkey(full_name), shipment_type:shipment_types(label_pt)')
      .order('created_at', { ascending: false })
    setProposals(props ?? [])

    const { data: cl } = await supabase
      .from('clients')
      .select('id, nickname, company_name, default_profit_split_pct, types:client_types(contact_type_id)')
      .eq('is_active', true)
      .order('nickname')
    setClients(cl ?? [])

    const { data: pr } = await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')
    setProfiles(pr ?? [])

    const { data: st } = await supabase.from('shipment_types').select('*').eq('is_active', true).order('sort_order')
    setShipmentTypes(st ?? [])

    const { data: it } = await supabase.from('incoterms').select('*').eq('is_active', true).order('code')
    setIncoterms(it ?? [])

    const { data: ct } = await supabase.from('contact_types').select('*').order('sort_order')
    setContactTypes(ct ?? [])

    setLoading(false)
  }

  function contactTypeId(code: string) {
    return contactTypes.find(c => c.code === code)?.id
  }

  function clientsByType(code: string) {
    const typeId = contactTypeId(code)
    if (!typeId) return []
    return clients.filter(c => c.types?.some((t: any) => t.contact_type_id === typeId))
  }

  const agentOptions = clientsByType('agente')
  const insurerOptions = clientsByType('seguradora')
  const thirdPartyTypeIds = ['fornecedor', 'despachante_aduaneiro', 'terminal'].map(contactTypeId).filter(Boolean)
  const thirdPartyOptions = clients.filter(c => c.types?.some((t: any) => thirdPartyTypeIds.includes(t.contact_type_id)))
  const clientOptions = clientsByType('cliente')

  function openNew() {
    setForm({
      client_id: '', opening_date: new Date().toISOString().slice(0, 10), inside_user_id: '',
      shipment_type_id: '', international_agent_id: '', deconsolidator_agent_id: '',
      commissioned_third_party_id: '', cargo_nature: '', has_insurance: false, insurer_id: '',
      incoterm_id: '', proposal_notes: '', client_notes: '',
    })
    setMsg('')
    setShowForm(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      client_id: form.client_id,
      opening_date: form.opening_date,
      inside_user_id: form.inside_user_id || null,
      shipment_type_id: form.shipment_type_id || null,
      international_agent_id: form.international_agent_id || null,
      deconsolidator_agent_id: form.deconsolidator_agent_id || null,
      commissioned_third_party_id: form.commissioned_third_party_id || null,
      cargo_nature: form.cargo_nature || null,
      has_insurance: form.has_insurance,
      insurer_id: form.has_insurance ? (form.insurer_id || null) : null,
      incoterm_id: form.incoterm_id || null,
      proposal_notes: form.proposal_notes || null,
      client_notes: form.client_notes || null,
      created_by: user?.id,
    }

    const { data, error } = await supabase.from('proposals').insert(payload).select().single()
    if (error) { setMsg('Erro ao criar: ' + error.message); setSaving(false); return }

    router.push(`/proposals/${data.id}`)
  }

  const filteredProposals = proposals.filter(p => {
    const matchSearch = !search ||
      p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.nickname?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || p.status === filterStatus
    return matchSearch && matchStatus
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
          <span className="text-sm text-gray-500">Propostas</span>
        </div>
        <button onClick={() => router.push('/comercial')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Propostas Comerciais ({proposals.length})</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 flex-wrap">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por referência ou cliente..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-72"/>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={openNew}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition">
            + Nova Proposta
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Ref</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Data Abertura</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Inside</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Tipo de Embarque</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{p.reference_number}</td>
                  <td className="px-4 py-3 text-gray-900">{p.client?.nickname || p.client?.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.opening_date ? new Date(p.opening_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.inside_user?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.shipment_type?.label_pt || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/proposals/${p.id}`)} className="text-xs text-gray-500 hover:text-gray-900 transition">Abrir</button>
                  </td>
                </tr>
              ))}
              {filteredProposals.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Nenhuma proposta encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredProposals.length} de {proposals.length} propostas</p>
      </div>

      {/* New Proposal Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Nova Proposta Comercial</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Selecione —</option>
                    {clientOptions.map(c => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de Abertura *</label>
                  <input type="date" value={form.opening_date} onChange={e => setForm({...form, opening_date: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inside (Responsável)</label>
                  <select value={form.inside_user_id} onChange={e => setForm({...form, inside_user_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Embarque</label>
                  <select value={form.shipment_type_id} onChange={e => setForm({...form, shipment_type_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {shipmentTypes.map(s => <option key={s.id} value={s.id}>{s.label_pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Incoterms</label>
                  <select value={form.incoterm_id} onChange={e => setForm({...form, incoterm_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {incoterms.map(i => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Agentes e Parceiros</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agente Internacional</label>
                  <select value={form.international_agent_id} onChange={e => setForm({...form, international_agent_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {agentOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agente Desconsolidador</label>
                  <select value={form.deconsolidator_agent_id} onChange={e => setForm({...form, deconsolidator_agent_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {agentOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Terceiro Comissionado</label>
                  <select value={form.commissioned_third_party_id} onChange={e => setForm({...form, commissioned_third_party_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— Nenhum —</option>
                    {thirdPartyOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Despachante, terminal ou fornecedor que recebe comissão nesta operação.</p>
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Mercadoria e Seguro</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo da Mercadoria</label>
                  <input type="text" value={form.cargo_nature} onChange={e => setForm({...form, cargo_nature: e.target.value})}
                    placeholder="ex: Carga geral, eletrônicos..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="flex items-end gap-3 pb-2">
                  <button type="button"
                    onClick={() => setForm({...form, has_insurance: !form.has_insurance})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.has_insurance ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.has_insurance ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                  <span className="text-sm text-gray-700">Seguro {form.has_insurance ? 'Sim' : 'Não'}</span>
                </div>
                {form.has_insurance && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Seguradora</label>
                    <select value={form.insurer_id} onChange={e => setForm({...form, insurer_id: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="">— Selecione —</option>
                      {insurerOptions.map(i => <option key={i.id} value={i.id}>{i.nickname || i.company_name}</option>)}
                    </select>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações da Proposta</label>
                  <textarea value={form.proposal_notes} onChange={e => setForm({...form, proposal_notes: e.target.value})} rows={2}
                    placeholder="Uso interno"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações do Cliente</label>
                  <textarea value={form.client_notes} onChange={e => setForm({...form, client_notes: e.target.value})} rows={2}
                    placeholder="Aparece no PDF enviado ao cliente"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
              </div>

              {msg && <p className="text-sm text-red-500">{msg}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Criando...' : 'Criar Proposta e Continuar'}
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
