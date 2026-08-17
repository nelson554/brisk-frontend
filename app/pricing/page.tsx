'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

const AIR_RATE_FIELDS = [
  { key: 'rate_min', label: 'Mínimo' },
  { key: 'rate_normal', label: 'Normal' },
  { key: 'rate_plus_45', label: '+45' },
  { key: 'rate_plus_100', label: '+100' },
  { key: 'rate_plus_300', label: '+300' },
  { key: 'rate_plus_500', label: '+500' },
  { key: 'rate_plus_1000', label: '+1000' },
  { key: 'rate_plus_3000', label: '+3000' },
]

const SEA_RATE_FIELDS = [
  { key: 'rate_lcl', label: 'LCL' },
  { key: 'rate_20dc', label: "20' DC" },
  { key: 'rate_20rf', label: "20' RF" },
  { key: 'rate_20fr', label: "20' FR" },
  { key: 'rate_20ot', label: "20' OT" },
  { key: 'rate_20nor', label: "20' NOR" },
  { key: 'rate_40dc', label: "40' DC" },
  { key: 'rate_40hc', label: "40' HC" },
  { key: 'rate_40rf', label: "40' RF" },
  { key: 'rate_40ot', label: "40' OT" },
  { key: 'rate_40fr', label: "40' FR" },
  { key: 'rate_40nor', label: "40' NOR" },
]

const ALL_RATE_KEYS = [...AIR_RATE_FIELDS, ...SEA_RATE_FIELDS].map(f => f.key)

function emptyForm() {
  const base: any = {
    agent_id: '', agent_name: '', modal: 'air', origin: '', destination: '',
    commodity: '', currency_code: 'USD', transit_time: '', via: '', free_time: '',
    frequency: '', contact: '', validity: '', observations: '',
  }
  ALL_RATE_KEYS.forEach(k => { base[k] = '' })
  return base
}

export default function PricingPage() {
  const router = useRouter()
  const [rates, setRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [modalFilter, setModalFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadRates()
    loadAgents()
  }, [])

  async function loadRates() {
    setLoading(true)
    const { data } = await supabase
      .from('freight_rates')
      .select('*, clients(nickname, company_name)')
      .eq('is_active', true)
      .order('agent_name')
    setRates(data || [])
    setLoading(false)
  }

  async function loadAgents() {
    const { data } = await supabase
      .from('client_types')
      .select('client_id, clients(id, nickname, company_name)')
      .eq('contact_type_id', 2)
    const list = (data || [])
      .map((r: any) => r.clients)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.nickname || '').localeCompare(b.nickname || ''))
    setAgents(list)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(rate: any) {
    setEditing(rate)
    const f: any = { ...rate }
    ALL_RATE_KEYS.forEach(k => { f[k] = rate[k] ?? '' })
    setForm(f)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()

    const payload: any = { ...form }
    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    delete payload.created_by
    delete payload.clients
    delete payload.is_active
    delete payload.excel_row_key

    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null
    })

    // qualquer criação ou edição manual trava o registro: a sincronização do OneDrive
    // nunca mais vai atualizar nem excluir esta tarifa, mesmo que suma da planilha
    payload.is_locked = true
    payload.source = 'manual'

    let error
    if (editing) {
      const res = await supabase.from('freight_rates').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      payload.created_by = user?.id || null
      const res = await supabase.from('freight_rates').insert(payload)
      error = res.error
    }

    setSaving(false)

    if (error) {
      setMsg('Erro ao salvar: ' + error.message)
      return
    }

    setShowModal(false)
    loadRates()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta tarifa?')) return
    await supabase.from('freight_rates').update({ is_active: false }).eq('id', id)
    loadRates()
  }

  const filtered = rates.filter((r: any) => {
    if (modalFilter && r.modal !== modalFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = [r.agent_name, r.origin, r.destination, r.clients?.nickname, r.clients?.company_name]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <button onClick={() => router.push('/comercial')} className="text-sm text-gray-500 hover:text-gray-900 transition">Comercial</button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Pricing</span>
        </div>
        <button onClick={() => router.push('/comercial')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Voltar</button>
      </nav>

      <div className="px-8 py-10 max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Pricing</h2>
            <p className="text-gray-500 text-sm">Tabela de tarifas de frete por agente e rota.</p>
          </div>
          <button onClick={openCreate} className="bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition">
            + Nova Tarifa
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por agente, origem ou destino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputClass} max-w-sm`}
          />
          <select value={modalFilter} onChange={e => setModalFilter(e.target.value)} className={`${inputClass} max-w-[160px]`}>
            <option value="">Todos os modais</option>
            <option value="air">Aéreo</option>
            <option value="sea">Marítimo</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Agente</th>
                <th className="px-6 py-3">Modal</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Destino</th>
                <th className="px-6 py-3">Moeda</th>
                <th className="px-6 py-3">Validade</th>
                <th className="px-6 py-3">Fonte</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Nenhuma tarifa encontrada.</td></tr>
              )}
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {r.clients?.nickname || r.agent_name}
                    {!r.agent_id && <span className="ml-2 text-xs text-amber-600">(não vinculado)</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{r.modal === 'air' ? 'Aéreo' : r.modal === 'sea' ? 'Marítimo' : r.modal || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{r.origin || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{r.destination || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{r.currency_code || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{r.validity || '—'}</td>
                  <td className="px-6 py-4">
                    {r.is_locked ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">🔒 Travado</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Excel</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(r)} className="text-xs text-gray-500 hover:text-gray-900 mr-3">Editar</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editing ? 'Editar Tarifa' : 'Nova Tarifa'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Agente (cadastrado)</label>
                  <select
                    value={form.agent_id || ''}
                    onChange={e => {
                      const agent = agents.find((a: any) => a.id === e.target.value)
                      setForm({ ...form, agent_id: e.target.value, agent_name: agent ? (agent.nickname || agent.company_name) : form.agent_name })
                    }}
                    className={inputClass}
                  >
                    <option value="">— Não vincular —</option>
                    {agents.map((a: any) => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Modal *</label>
                  <select value={form.modal} onChange={e => setForm({ ...form, modal: e.target.value })} required className={inputClass}>
                    <option value="air">Aéreo</option>
                    <option value="sea">Marítimo</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Nome do Agente (texto livre, usado se não vinculado)</label>
                  <input type="text" value={form.agent_name || ''} onChange={e => setForm({ ...form, agent_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Origem</label>
                  <input type="text" value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Destino</label>
                  <input type="text" value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Moeda</label>
                  <input type="text" value={form.currency_code || ''} onChange={e => setForm({ ...form, currency_code: e.target.value })} placeholder="USD" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Commodity</label>
                  <input type="text" value={form.commodity || ''} onChange={e => setForm({ ...form, commodity: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Transit Time</label>
                  <input type="text" value={form.transit_time || ''} onChange={e => setForm({ ...form, transit_time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Via</label>
                  <input type="text" value={form.via || ''} onChange={e => setForm({ ...form, via: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Tarifas {form.modal === 'air' ? '(Aéreo)' : '(Marítimo)'}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {(form.modal === 'air' ? AIR_RATE_FIELDS : SEA_RATE_FIELDS).map(f => (
                    <div key={f.key}>
                      <label className={labelClass}>{f.label}</label>
                      <input
                        type="number" step="0.01"
                        value={form[f.key] ?? ''}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Free Time</label>
                  <input type="text" value={form.free_time || ''} onChange={e => setForm({ ...form, free_time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Frequência</label>
                  <input type="text" value={form.frequency || ''} onChange={e => setForm({ ...form, frequency: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Validade</label>
                  <input type="text" value={form.validity || ''} onChange={e => setForm({ ...form, validity: e.target.value })} placeholder="Ex: 31/12/2026" className={inputClass} />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Contato</label>
                  <input type="text" value={form.contact || ''} onChange={e => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Observações</label>
                  <textarea value={form.observations || ''} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} className={inputClass} />
                </div>
              </div>

              {msg && <p className="text-sm text-red-600">{msg}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
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
