'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/AppHeader'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const UNLOCK_ROLES = ['admin', 'commercial_supervisor']

function fmtDateTime(v: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleString('pt-BR')
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

function fmtMoney(v: number, symbol = '') {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${symbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim()
}

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'proposta' | 'produtos' | 'resumo'>('proposta')
  const [proposal, setProposal] = useState<any>(null)
  const [headerForm, setHeaderForm] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [approving, setApproving] = useState(false)

  // expand state
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const [expandedFreight, setExpandedFreight] = useState<Set<string>>(new Set())

  // reference data
  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [shipmentTypes, setShipmentTypes] = useState<any[]>([])
  const [incoterms, setIncoterms] = useState<any[]>([])
  const [operationTypes, setOperationTypes] = useState<any[]>([])
  const [cargoTypes, setCargoTypes] = useState<any[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([])
  const [billingUnits, setBillingUnits] = useState<any[]>([])
  const [portsAirports, setPortsAirports] = useState<any[]>([])
  const [customsFacilities, setCustomsFacilities] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([])

  // derived filtered lists
  const clientOptions = clients.filter((c: any) => c.type_ids?.includes(1))
  const agentOptions = clients.filter((c: any) => c.type_ids?.includes(2))
  const insurerOptions = clients.filter((c: any) => c.type_ids?.includes(10))
  const thirdPartyOptions = clients.filter((c: any) => [4, 5, 6].some(t => c.type_ids?.includes(t)))
  const carrierOptions = clients.filter((c: any) => [7, 11, 12, 15].some(t => c.type_ids?.includes(t)))
  const salesRepOptions = profiles.filter((p: any) => p.role === 'sales_rep')

  const approvedByName = profiles.find((p: any) => p.id === proposal?.approved_by)?.full_name
  const isLocked = !!proposal?.is_approved
  const canUnlock = UNLOCK_ROLES.includes(myProfile?.role)
  const readOnly = isLocked && !canUnlock

  // modal state: generic for product / route / freight / ncm / expense
  const [modal, setModal] = useState<{ type: string; parentId?: string; editing?: any } | null>(null)
  const [modalForm, setModalForm] = useState<any>({})
  const [modalSaving, setModalSaving] = useState(false)

  useEffect(() => {
    if (proposalId) {
      loadHeader()
      loadProducts()
      loadReferenceData()
    }
  }, [proposalId])

  async function loadHeader() {
    setLoading(true)
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()
    setProposal(data)
    setHeaderForm(data)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: mp } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
      setMyProfile(mp)
    }

    setLoading(false)
  }

  async function handleApprove() {
    if (!confirm('Aprovar esta proposta? Depois de aprovada, ela fica travada para edição — só admin ou supervisor comercial podem reabrir.')) return
    setApproving(true)
    setMsg('')
    const { error } = await supabase.from('proposals').update({ is_approved: true }).eq('id', proposalId)
    setApproving(false)
    if (error) {
      setMsg('Erro ao aprovar: ' + error.message)
    } else {
      loadHeader()
    }
  }

  async function handleReopen() {
    if (!confirm('Reabrir esta proposta para edição?')) return
    setApproving(true)
    setMsg('')
    const { error } = await supabase.from('proposals').update({ is_approved: false }).eq('id', proposalId)
    setApproving(false)
    if (error) {
      setMsg('Erro ao reabrir: ' + error.message)
    } else {
      loadHeader()
    }
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('proposal_products')
      .select(`
        *,
        incoterms(code, name),
        operation_types(label_pt),
        cargo_types(label_pt),
        proposal_routes(
          *,
          origin:ports_airports!proposal_routes_origin_id_fkey(name, un_locode, iata_code),
          destination:ports_airports!proposal_routes_destination_id_fkey(name, un_locode, iata_code),
          carrier:clients!proposal_routes_carrier_id_fkey(nickname, company_name),
          route_agent:clients!proposal_routes_route_agent_id_fkey(nickname, company_name),
          delivery_facility:customs_facilities(trade_name, legal_name),
          currencies(code, symbol),
          proposal_freight_items(
            *,
            equipment_types(label_pt),
            billing_units(label_pt),
            proposal_freight_ncms(*)
          )
        ),
        proposal_expenses(
          *,
          chart_of_accounts(description_pt),
          currencies(code, symbol)
        )
      `)
      .eq('proposal_id', proposalId)
      .eq('is_active', true)
      .order('created_at')
    setProducts(data || [])
  }

  async function loadReferenceData() {
    const [
      cl, ct, pr, st, inc, ot, cgt, eqt, bu, pa, cf, cur, coa,
    ] = await Promise.all([
      supabase.from('clients').select('id, nickname, company_name, is_active').eq('is_active', true).order('nickname'),
      supabase.from('client_types').select('client_id, contact_type_id'),
      supabase.from('profiles').select('id, full_name, role').eq('is_active', true).order('full_name'),
      supabase.from('shipment_types').select('id, label_pt').eq('is_active', true).order('sort_order'),
      supabase.from('incoterms').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('operation_types').select('id, label_pt').eq('is_active', true).order('sort_order'),
      supabase.from('cargo_types').select('id, label_pt').eq('is_active', true).order('sort_order'),
      supabase.from('equipment_types').select('id, label_pt').eq('is_active', true).order('sort_order'),
      supabase.from('billing_units').select('id, label_pt').eq('is_active', true).order('sort_order'),
      supabase.from('ports_airports').select('id, name, un_locode, iata_code').eq('is_active', true).order('name'),
      supabase.from('customs_facilities').select('id, trade_name, legal_name').eq('is_active', true).order('trade_name'),
      supabase.from('currencies').select('id, code, symbol').eq('is_active', true).order('code'),
      supabase.from('chart_of_accounts').select('id, code, description_pt, transaction_type')
        .eq('is_active', true)
        .in('transaction_type', ['Operacional', 'Serviço', 'Serviço Internacional'])
        .order('code'),
    ])

    // attach type_ids to each client for filtering
    const typeMap: Record<string, number[]> = {}
    ;(ct.data || []).forEach((row: any) => {
      if (!typeMap[row.client_id]) typeMap[row.client_id] = []
      typeMap[row.client_id].push(row.contact_type_id)
    })
    const clientsWithTypes = (cl.data || []).map((c: any) => ({ ...c, type_ids: typeMap[c.id] || [] }))

    setClients(clientsWithTypes)
    setProfiles(pr.data || [])
    setShipmentTypes(st.data || [])
    setIncoterms(inc.data || [])
    setOperationTypes(ot.data || [])
    setCargoTypes(cgt.data || [])
    setEquipmentTypes(eqt.data || [])
    setBillingUnits(bu.data || [])
    setPortsAirports(pa.data || [])
    setCustomsFacilities(cf.data || [])
    setCurrencies(cur.data || [])
    setChartOfAccounts(coa.data || [])
  }

  async function handleSaveHeader(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const { id, reference_number, created_at, updated_at, created_by, ...updateData } = headerForm

    // normalize empty-string FKs to null
    Object.keys(updateData).forEach(k => {
      if (updateData[k] === '') updateData[k] = null
    })

    const { error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId)

    setSaving(false)

    if (error) {
      setMsg('Erro ao salvar: ' + error.message)
    } else {
      setMsg('Salvo com sucesso.')
      loadHeader()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  function toggleExpand(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFn(next)
  }

  if (loading || !headerForm) {
    return (
      <main style={{ minHeight: '100vh', background: '#f2f2f7' }} className="flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f2f2f7' }}>
      <PageHeader backHref="/proposals" backLabel="Propostas" />

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">{proposal?.reference_number}</h2>
              {isLocked && (
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">🔒 Aprovada</span>
              )}
            </div>
            <p className="text-gray-500 text-sm">Aberta em {proposal?.opening_date ? new Date(proposal.opening_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
            {isLocked && (
              <p className="text-gray-400 text-xs mt-0.5">
                Aprovada em {fmtDateTime(proposal?.approved_at)}{approvedByName ? ` por ${approvedByName}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/proposals/${proposalId}/imprimir`, '_blank', 'noopener,noreferrer')}
              className="text-sm text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition flex items-center gap-2"
            >
              🖨 Gerar PDF
            </button>
            {!isLocked && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="text-sm text-white bg-green-600 rounded-lg px-4 py-2 hover:bg-green-700 transition disabled:opacity-50"
              >
                {approving ? 'Aprovando...' : '✅ Aprovar'}
              </button>
            )}
            {isLocked && canUnlock && (
              <button
                onClick={handleReopen}
                disabled={approving}
                className="text-sm text-gray-700 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition disabled:opacity-50"
              >
                {approving ? 'Reabrindo...' : '🔓 Reabrir'}
              </button>
            )}
          </div>
        </div>

        {readOnly && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5 mb-6">
            Proposta aprovada — edição bloqueada. Somente admin ou supervisor comercial podem reabrir.
          </div>
        )}

        <div className="flex border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('proposta')}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${activeTab === 'proposta' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Proposta
          </button>
          <button onClick={() => setActiveTab('produtos')}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${activeTab === 'produtos' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Produtos ({products.length})
          </button>
          <button onClick={() => setActiveTab('resumo')}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${activeTab === 'resumo' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Resumo
          </button>
        </div>

        {/* ======= TAB: PROPOSTA ======= */}
        {activeTab === 'proposta' && (
          <form onSubmit={handleSaveHeader} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <fieldset disabled={readOnly} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cliente *</label>
                <select value={headerForm.client_id || ''} onChange={e => setHeaderForm({ ...headerForm, client_id: e.target.value })} required className={inputClass}>
                  <option value="">Selecione...</option>
                  {clientOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Data de Abertura *</label>
                <input type="date" value={headerForm.opening_date || ''} onChange={e => setHeaderForm({ ...headerForm, opening_date: e.target.value })} required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Inside (Responsável)</label>
                <select value={headerForm.inside_user_id || ''} onChange={e => setHeaderForm({ ...headerForm, inside_user_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de Embarque</label>
                <select value={headerForm.shipment_type_id || ''} onChange={e => setHeaderForm({ ...headerForm, shipment_type_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {shipmentTypes.map((s: any) => <option key={s.id} value={s.id}>{s.label_pt}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Sales Rep</label>
                <select value={headerForm.sales_rep_id || ''} onChange={e => setHeaderForm({ ...headerForm, sales_rep_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {salesRepOptions.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                {salesRepOptions.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Nenhum usuário com papel "Sales Rep" cadastrado ainda.</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Comissão do Sales Rep (%)</label>
                <input
                  type="number" step="0.01" min="0" max="100"
                  value={headerForm.sales_rep_commission_pct != null ? (headerForm.sales_rep_commission_pct * 100).toFixed(2) : ''}
                  onChange={e => setHeaderForm({ ...headerForm, sales_rep_commission_pct: e.target.value === '' ? null : Number(e.target.value) / 100 })}
                  className={inputClass}
                  placeholder="Ex: 3"
                />
              </div>

              <div>
                <label className={labelClass}>Agente Internacional</label>
                <select value={headerForm.international_agent_id || ''} onChange={e => setHeaderForm({ ...headerForm, international_agent_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {agentOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>% Lucro do Agente</label>
                <input
                  type="number" step="0.01" min="0" max="100"
                  value={headerForm.international_agent_profit_pct != null ? (headerForm.international_agent_profit_pct * 100).toFixed(2) : ''}
                  onChange={e => setHeaderForm({ ...headerForm, international_agent_profit_pct: e.target.value === '' ? null : Number(e.target.value) / 100 })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Agente Desconsolidador</label>
                <select value={headerForm.deconsolidator_agent_id || ''} onChange={e => setHeaderForm({ ...headerForm, deconsolidator_agent_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {agentOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Terceiro Comissionado</label>
                <select value={headerForm.commissioned_third_party_id || ''} onChange={e => setHeaderForm({ ...headerForm, commissioned_third_party_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {thirdPartyOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Incoterm</label>
                <select value={headerForm.incoterm_id || ''} onChange={e => setHeaderForm({ ...headerForm, incoterm_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {incoterms.map((i: any) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Natureza da Carga</label>
                <input type="text" value={headerForm.cargo_nature || ''} onChange={e => setHeaderForm({ ...headerForm, cargo_nature: e.target.value })} className={inputClass} />
              </div>

              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!headerForm.has_insurance} onChange={e => setHeaderForm({ ...headerForm, has_insurance: e.target.checked })} className="rounded border-gray-300" />
                  Possui Seguro
                </label>
              </div>
              {headerForm.has_insurance && (
                <div>
                  <label className={labelClass}>Seguradora</label>
                  <select value={headerForm.insurer_id || ''} onChange={e => setHeaderForm({ ...headerForm, insurer_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhuma —</option>
                    {insurerOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass}>Status</label>
                <select value={headerForm.status || 'draft'} onChange={e => setHeaderForm({ ...headerForm, status: e.target.value })} className={inputClass}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Observações da Proposta (interna)</label>
              <textarea value={headerForm.proposal_notes || ''} onChange={e => setHeaderForm({ ...headerForm, proposal_notes: e.target.value })} rows={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Observações para o Cliente</label>
              <textarea value={headerForm.client_notes || ''} onChange={e => setHeaderForm({ ...headerForm, client_notes: e.target.value })} rows={2} className={inputClass} />
            </div>

            {msg && <p className={`text-sm ${msg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}

            <button type="submit" disabled={saving} className="bg-gray-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            </fieldset>
          </form>
        )}

        {/* ======= TAB: PRODUTOS ======= */}
        {activeTab === 'produtos' && (
          <div className="space-y-4">
            {!readOnly && (
              <div className="flex justify-end">
                <button
                  onClick={() => openModal('product')}
                  className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  + Produto
                </button>
              </div>
            )}

            {products.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                Nenhum produto cadastrado nesta proposta ainda.
              </div>
            )}

            {products.map((product: any) => {
              const isOpen = expandedProducts.has(product.id)
              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div
                    className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleExpand(expandedProducts, setExpandedProducts, product.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {product.operation_types?.label_pt || 'Produto'} · {product.cargo_types?.label_pt || '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Incoterm: {product.incoterms?.code || '—'} · Peso: {product.chargeable_weight || product.gross_weight || '—'} kg
                        · {product.proposal_routes?.filter((r: any) => r.is_active).length || 0} rota(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!readOnly && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); openModal('product', undefined, product) }} className="text-xs text-gray-500 hover:text-gray-900">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); handleSoftDelete('proposal_products', product.id) }} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                        </>
                      )}
                      <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50/50">
                      {/* Rotas */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rotas</h4>
                          {!readOnly && <button onClick={() => openModal('route', product.id)} className="text-xs text-emerald-700 hover:text-emerald-900 font-medium">+ Rota</button>}
                        </div>

                        {(product.proposal_routes || []).filter((r: any) => r.is_active).length === 0 && (
                          <p className="text-xs text-gray-400">Nenhuma rota cadastrada.</p>
                        )}

                        <div className="space-y-2">
                          {(product.proposal_routes || []).filter((r: any) => r.is_active).map((route: any) => {
                            const routeOpen = expandedRoutes.has(route.id)
                            return (
                              <div key={route.id} className="bg-white rounded-lg border border-gray-100">
                                <div
                                  className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                                  onClick={() => toggleExpand(expandedRoutes, setExpandedRoutes, route.id)}
                                >
                                  <div>
                                    <p className="text-sm text-gray-900">
                                      {route.origin?.iata_code || route.origin?.un_locode || route.origin?.name || '—'}
                                      {' → '}
                                      {route.destination?.iata_code || route.destination?.un_locode || route.destination?.name || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Transportador: {route.carrier?.nickname || route.carrier?.company_name || '—'}
                                      · {(route.proposal_freight_items || []).filter((f: any) => f.is_active).length} item(s) de frete
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {!readOnly && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); openModal('route', product.id, route) }} className="text-xs text-gray-500 hover:text-gray-900">Editar</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleSoftDelete('proposal_routes', route.id) }} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                                      </>
                                    )}
                                    <span className="text-gray-400 text-xs">{routeOpen ? '▲' : '▼'}</span>
                                  </div>
                                </div>

                                {routeOpen && (
                                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens de Frete</h5>
                                      {!readOnly && <button onClick={() => openModal('freight', route.id)} className="text-xs text-emerald-700 hover:text-emerald-900 font-medium">+ Frete</button>}
                                    </div>

                                    {(route.proposal_freight_items || []).filter((f: any) => f.is_active).length === 0 && (
                                      <p className="text-xs text-gray-400">Nenhum item de frete.</p>
                                    )}

                                    {(route.proposal_freight_items || []).filter((f: any) => f.is_active).map((item: any) => {
                                      const itemOpen = expandedFreight.has(item.id)
                                      return (
                                        <div key={item.id} className="bg-gray-50 rounded-lg border border-gray-100">
                                          <div
                                            className="px-3 py-2.5 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                                            onClick={() => toggleExpand(expandedFreight, setExpandedFreight, item.id)}
                                          >
                                            <div>
                                              <p className="text-sm text-gray-900">
                                                {item.equipment_types?.label_pt || '—'} · Qtd {item.quantity || 0}
                                              </p>
                                              <p className="text-xs text-gray-500 mt-0.5">
                                                Compra {fmtMoney(item.purchase_rate, route.currencies?.symbol)} · Venda {fmtMoney(item.sale_rate, route.currencies?.symbol)}
                                                {' '}/ {item.billing_units?.label_pt || '—'}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              {!readOnly && (
                                                <>
                                                  <button onClick={(e) => { e.stopPropagation(); openModal('freight', route.id, item) }} className="text-xs text-gray-500 hover:text-gray-900">Editar</button>
                                                  <button onClick={(e) => { e.stopPropagation(); handleSoftDelete('proposal_freight_items', item.id) }} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                                                </>
                                              )}
                                              <span className="text-gray-400 text-xs">{itemOpen ? '▲' : '▼'}</span>
                                            </div>
                                          </div>

                                          {itemOpen && (
                                            <div className="border-t border-gray-100 px-3 py-2.5 space-y-2">
                                              <div className="flex justify-between items-center">
                                                <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">NCMs</h6>
                                                {!readOnly && <button onClick={() => openModal('ncm', item.id)} className="text-xs text-emerald-700 hover:text-emerald-900 font-medium">+ NCM</button>}
                                              </div>
                                              {(item.proposal_freight_ncms || []).length === 0 && (
                                                <p className="text-xs text-gray-400">Nenhum NCM cadastrado.</p>
                                              )}
                                              {(item.proposal_freight_ncms || []).map((ncm: any) => (
                                                <div key={ncm.id} className="flex justify-between items-center text-xs bg-white rounded px-3 py-2 border border-gray-100">
                                                  <span className="text-gray-700">{ncm.ncm_code} — {ncm.description || 'sem descrição'}</span>
                                                  {!readOnly && (
                                                    <div className="flex items-center gap-2">
                                                      <button onClick={() => openModal('ncm', item.id, ncm)} className="text-gray-500 hover:text-gray-900">Editar</button>
                                                      <button onClick={() => handleHardDelete('proposal_freight_ncms', ncm.id)} className="text-red-500 hover:text-red-700">Remover</button>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Despesas */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Despesas</h4>
                          {!readOnly && <button onClick={() => openModal('expense', product.id)} className="text-xs text-emerald-700 hover:text-emerald-900 font-medium">+ Despesa</button>}
                        </div>

                        {(product.proposal_expenses || []).filter((x: any) => x.is_active).length === 0 && (
                          <p className="text-xs text-gray-400">Nenhuma despesa cadastrada.</p>
                        )}

                        {(product.proposal_expenses || []).filter((x: any) => x.is_active).length > 0 && (
                          <table className="w-full text-xs bg-white rounded-lg border border-gray-100 overflow-hidden">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="px-3 py-2">Conta</th>
                                <th className="px-3 py-2">Local</th>
                                <th className="px-3 py-2">Compra</th>
                                <th className="px-3 py-2">Venda</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(product.proposal_expenses || []).filter((x: any) => x.is_active).map((exp: any) => (
                                <tr key={exp.id} className="border-b border-gray-50 last:border-0">
                                  <td className="px-3 py-2 text-gray-700">{exp.chart_of_accounts?.description_pt || '—'}</td>
                                  <td className="px-3 py-2 text-gray-500">{exp.location}</td>
                                  <td className="px-3 py-2 text-gray-700">{fmtMoney(exp.purchase_amount, exp.currencies?.symbol)}</td>
                                  <td className="px-3 py-2 text-gray-700">{fmtMoney(exp.sale_amount, exp.currencies?.symbol)}</td>
                                  <td className="px-3 py-2 text-right">
                                    {!readOnly && (
                                      <>
                                        <button onClick={() => openModal('expense', product.id, exp)} className="text-gray-500 hover:text-gray-900 mr-2">Editar</button>
                                        <button onClick={() => handleSoftDelete('proposal_expenses', exp.id)} className="text-red-500 hover:text-red-700">Remover</button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ======= TAB: RESUMO ======= */}
        {activeTab === 'resumo' && <ResumoTab products={products} />}
      </div>

      {modal && (
        <ProposalModal
          modal={modal}
          form={modalForm}
          setForm={setModalForm}
          saving={modalSaving}
          onClose={closeModal}
          onSave={handleModalSave}
          refData={{
            operationTypes, incoterms, cargoTypes, portsAirports, customsFacilities,
            currencies, carrierOptions, agentOptions, equipmentTypes, billingUnits,
            chartOfAccounts,
          }}
        />
      )}
    </main>
  )

  // ---- modal helpers ----
  function openModal(type: string, parentId?: string, editing?: any) {
    let defaults: any = {}
    if (type === 'product') defaults = editing ? { ...editing } : { operation_type_id: '', incoterm_id: '', cargo_type_id: '', master_freight_terms: '', house_freight_terms: '', gross_weight: '', chargeable_weight: '', notes: '' }
    if (type === 'route') defaults = editing ? { ...editing } : { carrier_id: '', origin_id: '', destination_id: '', has_dta: false, delivery_facility_id: '', currency_id: '', route_description: '', frequency: '', transit_time: '', contract_number: '', validity_date: '', route_agent_id: '', profit_pct: '', carrier_detention: '', brisk_detention: '' }
    if (type === 'freight') defaults = editing ? { ...editing } : { equipment_type_id: '', quantity: '', purchase_rate: '', sale_rate: '', billing_unit_id: '', carrier_free_time: '', client_free_time: '', freight_notes: '' }
    if (type === 'ncm') defaults = editing ? { ...editing } : { ncm_code: '', description: '' }
    if (type === 'expense') defaults = editing ? { ...editing } : { chart_of_account_id: '', location: '', currency_id: '', purchase_amount: '', sale_amount: '', notes: '' }
    setModalForm(defaults)
    setModal({ type, parentId, editing })
  }

  function closeModal() {
    setModal(null)
    setModalForm({})
  }

  async function handleModalSave() {
    if (!modal) return
    setModalSaving(true)

    const table: Record<string, string> = {
      product: 'proposal_products',
      route: 'proposal_routes',
      freight: 'proposal_freight_items',
      ncm: 'proposal_freight_ncms',
      expense: 'proposal_expenses',
    }
    const parentField: Record<string, string> = {
      product: 'proposal_id',
      route: 'proposal_product_id',
      freight: 'proposal_route_id',
      ncm: 'proposal_freight_item_id',
      expense: 'proposal_product_id',
    }

    const { data: { user } } = await supabase.auth.getUser()

    const payload: any = { ...modalForm }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    delete payload.created_by
    // strip embedded relation objects that may have come from `editing`
    Object.keys(payload).forEach(k => {
      if (payload[k] && typeof payload[k] === 'object' && !Array.isArray(payload[k])) delete payload[k]
      if (Array.isArray(payload[k])) delete payload[k]
    })

    let error
    if (modal.editing) {
      const res = await supabase.from(table[modal.type]).update(payload).eq('id', modal.editing.id)
      error = res.error
    } else {
      payload[parentField[modal.type]] = modal.parentId
      if (modal.type !== 'ncm') payload.created_by = user?.id || null
      const res = await supabase.from(table[modal.type]).insert(payload)
      error = res.error
    }

    setModalSaving(false)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    closeModal()
    loadProducts()
  }

  async function handleSoftDelete(table: string, id: string) {
    if (!confirm('Remover este registro?')) return
    await supabase.from(table).update({ is_active: false }).eq('id', id)
    loadProducts()
  }

  async function handleHardDelete(table: string, id: string) {
    if (!confirm('Remover este registro?')) return
    await supabase.from(table).delete().eq('id', id)
    loadProducts()
  }
}

// ============ RESUMO TAB ============
function ResumoTab({ products }: { products: any[] }) {
  const totals: Record<string, { code: string; symbol: string; purchase: number; sale: number }> = {}

  function addTotal(currencyObj: any, purchase: number, sale: number) {
    if (!currencyObj) return
    const key = currencyObj.code || 'N/D'
    if (!totals[key]) totals[key] = { code: key, symbol: currencyObj.symbol || '', purchase: 0, sale: 0 }
    totals[key].purchase += purchase || 0
    totals[key].sale += sale || 0
  }

  products.forEach((product: any) => {
    ;(product.proposal_routes || []).filter((r: any) => r.is_active).forEach((route: any) => {
      ;(route.proposal_freight_items || []).filter((f: any) => f.is_active).forEach((item: any) => {
        const qty = Number(item.quantity) || 0
        addTotal(route.currencies, (Number(item.purchase_rate) || 0) * qty, (Number(item.sale_rate) || 0) * qty)
      })
    })
    ;(product.proposal_expenses || []).filter((x: any) => x.is_active).forEach((exp: any) => {
      addTotal(exp.currencies, Number(exp.purchase_amount) || 0, Number(exp.sale_amount) || 0)
    })
  })

  const rows = Object.values(totals)

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
        Nenhum valor lançado ainda. Adicione itens de frete ou despesas nos produtos para ver o resumo.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="px-6 py-3">Moeda</th>
            <th className="px-6 py-3">Custo</th>
            <th className="px-6 py-3">Venda</th>
            <th className="px-6 py-3">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-4 font-medium text-gray-900">{r.code}</td>
              <td className="px-6 py-4 text-gray-700">{fmtMoney(r.purchase, r.symbol)}</td>
              <td className="px-6 py-4 text-gray-700">{fmtMoney(r.sale, r.symbol)}</td>
              <td className="px-6 py-4 font-medium text-emerald-700">{fmtMoney(r.sale - r.purchase, r.symbol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============ MODAL ============
function ProposalModal({ modal, form, setForm, saving, onClose, onSave, refData }: any) {
  const titles: Record<string, string> = {
    product: modal.editing ? 'Editar Produto' : 'Novo Produto',
    route: modal.editing ? 'Editar Rota' : 'Nova Rota',
    freight: modal.editing ? 'Editar Item de Frete' : 'Novo Item de Frete',
    ncm: modal.editing ? 'Editar NCM' : 'Novo NCM',
    expense: modal.editing ? 'Editar Despesa' : 'Nova Despesa',
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{titles[modal.type]}</h3>

        <form onSubmit={(e) => { e.preventDefault(); onSave() }} className="space-y-4">
          {modal.type === 'product' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo de Operação</label>
                  <select value={form.operation_type_id || ''} onChange={e => setForm({ ...form, operation_type_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.operationTypes.map((o: any) => <option key={o.id} value={o.id}>{o.label_pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Incoterm</label>
                  <select value={form.incoterm_id || ''} onChange={e => setForm({ ...form, incoterm_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.incoterms.map((i: any) => <option key={i.id} value={i.id}>{i.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tipo de Carga</label>
                  <select value={form.cargo_type_id || ''} onChange={e => setForm({ ...form, cargo_type_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.cargoTypes.map((c: any) => <option key={c.id} value={c.id}>{c.label_pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Peso Bruto (kg)</label>
                  <input type="number" step="0.01" value={form.gross_weight || ''} onChange={e => setForm({ ...form, gross_weight: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Peso Taxável (kg)</label>
                  <input type="number" step="0.01" value={form.chargeable_weight || ''} onChange={e => setForm({ ...form, chargeable_weight: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => window.open('https://weightcalculatorbrisk.lovable.app', '_blank', 'noopener,noreferrer')}
                    className="text-xs text-sky-700 hover:text-sky-900 font-medium inline-flex items-center gap-1"
                  >
                    🧮 Abrir Calculadora de Peso Taxável
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Condições de Frete Master</label>
                <input type="text" value={form.master_freight_terms || ''} onChange={e => setForm({ ...form, master_freight_terms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Condições de Frete House</label>
                <input type="text" value={form.house_freight_terms || ''} onChange={e => setForm({ ...form, house_freight_terms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Observações</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} />
              </div>
            </>
          )}

          {modal.type === 'route' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Origem</label>
                  <select value={form.origin_id || ''} onChange={e => setForm({ ...form, origin_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhuma —</option>
                    {refData.portsAirports.map((p: any) => <option key={p.id} value={p.id}>{p.iata_code || p.un_locode} — {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Destino</label>
                  <select value={form.destination_id || ''} onChange={e => setForm({ ...form, destination_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.portsAirports.map((p: any) => <option key={p.id} value={p.id}>{p.iata_code || p.un_locode} — {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Transportador</label>
                  <select value={form.carrier_id || ''} onChange={e => setForm({ ...form, carrier_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.carrierOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Agente da Rota</label>
                  <select value={form.route_agent_id || ''} onChange={e => setForm({ ...form, route_agent_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.agentOptions.map((c: any) => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Moeda</label>
                  <select value={form.currency_id || ''} onChange={e => setForm({ ...form, currency_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhuma —</option>
                    {refData.currencies.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Recinto de Entrega</label>
                  <select value={form.delivery_facility_id || ''} onChange={e => setForm({ ...form, delivery_facility_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhum —</option>
                    {refData.customsFacilities.map((f: any) => <option key={f.id} value={f.id}>{f.trade_name || f.legal_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Frequência</label>
                  <input type="text" value={form.frequency || ''} onChange={e => setForm({ ...form, frequency: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Transit Time</label>
                  <input type="text" value={form.transit_time || ''} onChange={e => setForm({ ...form, transit_time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nº do Contrato</label>
                  <input type="text" value={form.contract_number || ''} onChange={e => setForm({ ...form, contract_number: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Validade</label>
                  <input type="date" value={form.validity_date || ''} onChange={e => setForm({ ...form, validity_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>% Lucro da Rota</label>
                  <input type="number" step="0.01" min="0" max="100"
                    value={form.profit_pct != null && form.profit_pct !== '' ? (Number(form.profit_pct) * 100).toFixed(2) : ''}
                    onChange={e => setForm({ ...form, profit_pct: e.target.value === '' ? '' : Number(e.target.value) / 100 })}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Detention Transportador</label>
                  <input type="text" value={form.carrier_detention || ''} onChange={e => setForm({ ...form, carrier_detention: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Detention Brisk</label>
                  <input type="text" value={form.brisk_detention || ''} onChange={e => setForm({ ...form, brisk_detention: e.target.value })} className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form.has_dta} onChange={e => setForm({ ...form, has_dta: e.target.checked })} className="rounded border-gray-300" />
                Possui DTA
              </label>
              <div>
                <label className={labelClass}>Descrição da Rota</label>
                <textarea value={form.route_description || ''} onChange={e => setForm({ ...form, route_description: e.target.value })} rows={2} className={inputClass} />
              </div>
            </>
          )}

          {modal.type === 'freight' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Equipamento</label>
                <select value={form.equipment_type_id || ''} onChange={e => setForm({ ...form, equipment_type_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhum —</option>
                  {refData.equipmentTypes.map((e2: any) => <option key={e2.id} value={e2.id}>{e2.label_pt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quantidade</label>
                <input type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tarifa de Compra</label>
                <input type="number" step="0.01" value={form.purchase_rate || ''} onChange={e => setForm({ ...form, purchase_rate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tarifa de Venda</label>
                <input type="number" step="0.01" value={form.sale_rate || ''} onChange={e => setForm({ ...form, sale_rate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Unidade de Cobrança</label>
                <select value={form.billing_unit_id || ''} onChange={e => setForm({ ...form, billing_unit_id: e.target.value })} className={inputClass}>
                  <option value="">— Nenhuma —</option>
                  {refData.billingUnits.map((b: any) => <option key={b.id} value={b.id}>{b.label_pt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Free Time Transportador</label>
                <input type="text" value={form.carrier_free_time || ''} onChange={e => setForm({ ...form, carrier_free_time: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Free Time Cliente</label>
                <input type="text" value={form.client_free_time || ''} onChange={e => setForm({ ...form, client_free_time: e.target.value })} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Observações</label>
                <textarea value={form.freight_notes || ''} onChange={e => setForm({ ...form, freight_notes: e.target.value })} rows={2} className={inputClass} />
              </div>
            </div>
          )}

          {modal.type === 'ncm' && (
            <>
              <div>
                <label className={labelClass}>Código NCM *</label>
                <input type="text" required value={form.ncm_code || ''} onChange={e => setForm({ ...form, ncm_code: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <input type="text" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>
            </>
          )}

          {modal.type === 'expense' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Conta do Plano de Contas</label>
                  <select value={form.chart_of_account_id || ''} onChange={e => setForm({ ...form, chart_of_account_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhuma —</option>
                    {refData.chartOfAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.description_pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Local *</label>
                  <input type="text" required value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Moeda</label>
                  <select value={form.currency_id || ''} onChange={e => setForm({ ...form, currency_id: e.target.value })} className={inputClass}>
                    <option value="">— Nenhuma —</option>
                    {refData.currencies.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor de Compra</label>
                  <input type="number" step="0.01" value={form.purchase_amount || ''} onChange={e => setForm({ ...form, purchase_amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor de Venda</label>
                  <input type="number" step="0.01" value={form.sale_amount || ''} onChange={e => setForm({ ...form, sale_amount: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Observações</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
              {saving ? 'Salvando...' : modal.editing ? 'Salvar Alterações' : 'Criar'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
