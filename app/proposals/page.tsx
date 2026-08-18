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

// Palpite inicial de equipamento/unidade de cobrança para cada faixa de tarifa do Pricing.
// É só um ponto de partida pré-preenchido — o usuário revisa e pode trocar antes de salvar.
const RATE_KEY_SUGGESTION: Record<string, { equipmentLabel: string | null; billingLabel: string }> = {
  rate_min: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_normal: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_45: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_100: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_300: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_500: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_1000: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_plus_3000: { equipmentLabel: null, billingLabel: 'Quilo' },
  rate_lcl: { equipmentLabel: null, billingLabel: 'Metro Cúbico' },
  rate_20dc: { equipmentLabel: "20'", billingLabel: 'Container' },
  rate_20rf: { equipmentLabel: 'Reefer', billingLabel: 'Container' },
  rate_20fr: { equipmentLabel: 'Flat Rack', billingLabel: 'Container' },
  rate_20ot: { equipmentLabel: 'Open Top', billingLabel: 'Container' },
  rate_20nor: { equipmentLabel: "20'", billingLabel: 'Container' },
  rate_40dc: { equipmentLabel: "40'", billingLabel: 'Container' },
  rate_40hc: { equipmentLabel: '40HC', billingLabel: 'Container' },
  rate_40rf: { equipmentLabel: 'Reefer', billingLabel: 'Container' },
  rate_40ot: { equipmentLabel: 'Open Top', billingLabel: 'Container' },
  rate_40fr: { equipmentLabel: 'Flat Rack', billingLabel: 'Container' },
  rate_40nor: { equipmentLabel: "40'", billingLabel: 'Container' },
}

function matchPort(text: string, ports: any[]): string {
  if (!text) return ''
  const t = text.trim().toLowerCase()
  if (!t) return ''
  const exact = ports.find((p: any) =>
    (p.iata_code || '').toLowerCase() === t || (p.un_locode || '').toLowerCase() === t
  )
  if (exact) return exact.id
  const partial = ports.find((p: any) =>
    (p.name || '').toLowerCase().includes(t) || (t.length > 2 && t.includes((p.name || '').toLowerCase()))
  )
  return partial ? partial.id : ''
}

function matchCurrency(code: string, currencies: any[]): string {
  if (!code) return ''
  const c = currencies.find((c: any) => (c.code || '').toLowerCase() === code.trim().toLowerCase())
  return c ? c.id : ''
}

function matchByLabel(label: string | null, list: any[]): string {
  if (!label) return ''
  const f = list.find((x: any) => x.label_pt === label)
  return f ? f.id : ''
}

function emptyHeaderForm() {
  return {
    client_id: '', opening_date: new Date().toISOString().slice(0, 10), inside_user_id: '',
    shipment_type_id: '', international_agent_id: '', deconsolidator_agent_id: '',
    commissioned_third_party_id: '', cargo_nature: '', has_insurance: false, insurer_id: '',
    incoterm_id: '', proposal_notes: '', client_notes: '',
  }
}

function emptyProductForm() {
  return { operation_type_id: '', incoterm_id: '', cargo_type_id: '', gross_weight: '', chargeable_weight: '', notes: '' }
}

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
  const [operationTypes, setOperationTypes] = useState<any[]>([])
  const [cargoTypes, setCargoTypes] = useState<any[]>([])
  const [freightRates, setFreightRates] = useState<any[]>([])
  const [portsAirports, setPortsAirports] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([])
  const [billingUnits, setBillingUnits] = useState<any[]>([])

  // wizard state
  const [showForm, setShowForm] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [headerForm, setHeaderForm] = useState<any>(emptyHeaderForm())
  const [productMode, setProductMode] = useState<'manual' | 'pricing' | null>(null)
  const [productForm, setProductForm] = useState<any>(emptyProductForm())

  // pricing-pull sub-state
  const [pricingSearch, setPricingSearch] = useState('')
  const [pricingModalFilter, setPricingModalFilter] = useState('')
  const [selectedRate, setSelectedRate] = useState<any>(null)
  const [selectedBracketKey, setSelectedBracketKey] = useState<string>('')
  const [routeForm, setRouteForm] = useState<any>({})
  const [freightForm, setFreightForm] = useState<any>({})

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

    const { data: pr } = await supabase.from('profiles').select('id, full_name, role').eq('is_active', true).order('full_name')
    setProfiles(pr ?? [])

    const { data: st } = await supabase.from('shipment_types').select('*').eq('is_active', true).order('sort_order')
    setShipmentTypes(st ?? [])

    const { data: it } = await supabase.from('incoterms').select('*').eq('is_active', true).order('code')
    setIncoterms(it ?? [])

    const { data: ct } = await supabase.from('contact_types').select('*').order('sort_order')
    setContactTypes(ct ?? [])

    const { data: ot } = await supabase.from('operation_types').select('id, label_pt').eq('is_active', true).order('sort_order')
    setOperationTypes(ot ?? [])

    const { data: cgt } = await supabase.from('cargo_types').select('id, label_pt').eq('is_active', true).order('sort_order')
    setCargoTypes(cgt ?? [])

    const { data: fr } = await supabase.from('freight_rates').select('*').eq('is_active', true).order('agent_name')
    setFreightRates(fr ?? [])

    const { data: pa } = await supabase.from('ports_airports').select('id, name, un_locode, iata_code').eq('is_active', true).order('name')
    setPortsAirports(pa ?? [])

    const { data: cur } = await supabase.from('currencies').select('id, code, symbol').eq('is_active', true).order('code')
    setCurrencies(cur ?? [])

    const { data: eqt } = await supabase.from('equipment_types').select('id, label_pt').eq('is_active', true).order('sort_order')
    setEquipmentTypes(eqt ?? [])

    const { data: bu } = await supabase.from('billing_units').select('id, label_pt').eq('is_active', true).order('id')
    setBillingUnits(bu ?? [])

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
    setHeaderForm(emptyHeaderForm())
    setProductForm(emptyProductForm())
    setProductMode(null)
    setSelectedRate(null)
    setSelectedBracketKey('')
    setRouteForm({})
    setFreightForm({})
    setPricingSearch('')
    setPricingModalFilter('')
    setStep(1)
    setMsg('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!headerForm.client_id || !headerForm.opening_date) {
      setMsg('Preencha cliente e data de abertura para continuar.')
      return
    }
    setMsg('')
    setStep(2)
  }

  function pickPricingRow(rate: any) {
    setSelectedRate(rate)
    setSelectedBracketKey('')
    setRouteForm({
      origin_id: matchPort(rate.origin, portsAirports),
      destination_id: matchPort(rate.destination, portsAirports),
      route_agent_id: rate.agent_id || '',
      currency_id: matchCurrency(rate.currency_code, currencies),
      transit_time: rate.transit_time || '',
      frequency: rate.frequency || '',
      route_description: [rate.via ? `Via: ${rate.via}` : '', rate.validity ? `Validade (Pricing): ${rate.validity}` : '', rate.observations || '']
        .filter(Boolean).join(' · '),
    })
    setProductForm((f: any) => ({ ...f, notes: rate.commodity ? `Commodity (Pricing): ${rate.commodity}` : f.notes }))
    setFreightForm({})
  }

  function pickBracket(key: string, label: string, value: any) {
    setSelectedBracketKey(key)
    const suggestion = RATE_KEY_SUGGESTION[key] || { equipmentLabel: null, billingLabel: 'Quilo' }
    setFreightForm({
      equipment_type_id: matchByLabel(suggestion.equipmentLabel, equipmentTypes),
      billing_unit_id: matchByLabel(suggestion.billingLabel, billingUnits),
      purchase_rate: value,
      sale_rate: '',
      carrier_free_time: selectedRate?.free_time || '',
      quantity: '',
      _bracketLabel: label,
    })
  }

  const filteredFreightRates = freightRates.filter((r: any) => {
    if (pricingModalFilter && r.modal !== pricingModalFilter) return false
    if (pricingSearch) {
      const s = pricingSearch.toLowerCase()
      const hay = [r.agent_name, r.origin, r.destination].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  async function handleFinalSubmit() {
    setSaving(true)
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()

    const headerPayload = {
      client_id: headerForm.client_id,
      opening_date: headerForm.opening_date,
      inside_user_id: headerForm.inside_user_id || null,
      shipment_type_id: headerForm.shipment_type_id || null,
      international_agent_id: headerForm.international_agent_id || null,
      deconsolidator_agent_id: headerForm.deconsolidator_agent_id || null,
      commissioned_third_party_id: headerForm.commissioned_third_party_id || null,
      cargo_nature: headerForm.cargo_nature || null,
      has_insurance: headerForm.has_insurance,
      insurer_id: headerForm.has_insurance ? (headerForm.insurer_id || null) : null,
      incoterm_id: headerForm.incoterm_id || null,
      proposal_notes: headerForm.proposal_notes || null,
      client_notes: headerForm.client_notes || null,
      created_by: user?.id,
    }

    const { data: prop, error: propErr } = await supabase.from('proposals').insert(headerPayload).select().single()
    if (propErr) { setMsg('Erro ao criar proposta: ' + propErr.message); setSaving(false); return }

    if (productMode) {
      const productPayload = {
        proposal_id: prop.id,
        operation_type_id: productForm.operation_type_id || null,
        incoterm_id: productForm.incoterm_id || headerForm.incoterm_id || null,
        cargo_type_id: productForm.cargo_type_id || null,
        gross_weight: productForm.gross_weight || null,
        chargeable_weight: productForm.chargeable_weight || null,
        notes: productForm.notes || null,
        created_by: user?.id,
      }
      const { data: prod, error: prodErr } = await supabase.from('proposal_products').insert(productPayload).select().single()

      if (prodErr) {
        setSaving(false)
        router.push(`/proposals/${prop.id}`)
        return
      }

      if (productMode === 'pricing' && selectedRate && selectedBracketKey) {
        const routePayload = {
          proposal_product_id: prod.id,
          origin_id: routeForm.origin_id || null,
          destination_id: routeForm.destination_id || null,
          currency_id: routeForm.currency_id || null,
          route_agent_id: routeForm.route_agent_id || null,
          transit_time: routeForm.transit_time || null,
          frequency: routeForm.frequency || null,
          route_description: routeForm.route_description || null,
          created_by: user?.id,
        }
        const { data: route, error: routeErr } = await supabase.from('proposal_routes').insert(routePayload).select().single()

        if (!routeErr && route) {
          const freightPayload = {
            proposal_route_id: route.id,
            equipment_type_id: freightForm.equipment_type_id || null,
            billing_unit_id: freightForm.billing_unit_id || null,
            purchase_rate: freightForm.purchase_rate || null,
            sale_rate: freightForm.sale_rate || null,
            carrier_free_time: freightForm.carrier_free_time || null,
            quantity: freightForm.quantity || null,
            created_by: user?.id,
          }
          await supabase.from('proposal_freight_items').insert(freightPayload)
        }
      }
    }

    router.push(`/proposals/${prop.id}`)
  }

  const filteredProposals = proposals.filter(p => {
    const matchSearch = !search ||
      p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.nickname?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || (filterStatus === 'approved' ? !!p.is_approved : p.status === filterStatus)
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
                    {p.is_approved ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">🔒 Aprovada</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    )}
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

      {/* New Proposal Wizard */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Nova Proposta Comercial</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-6">Passo {step} de 2 — {step === 1 ? 'Dados da proposta' : 'Primeiro produto'}</p>

            {step === 1 && (
              <form onSubmit={goToStep2} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Cliente *</label>
                    <select value={headerForm.client_id} onChange={e => setHeaderForm({...headerForm, client_id: e.target.value})} required
                      className={inputClass}>
                      <option value="">— Selecione —</option>
                      {clientOptions.map(c => <option key={c.id} value={c.id}>{c.nickname || c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Data de Abertura *</label>
                    <input type="date" value={headerForm.opening_date} onChange={e => setHeaderForm({...headerForm, opening_date: e.target.value})} required
                      className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Inside (Responsável)</label>
                    <select value={headerForm.inside_user_id} onChange={e => setHeaderForm({...headerForm, inside_user_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de Embarque</label>
                    <select value={headerForm.shipment_type_id} onChange={e => setHeaderForm({...headerForm, shipment_type_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {shipmentTypes.map(s => <option key={s.id} value={s.id}>{s.label_pt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Incoterms</label>
                    <select value={headerForm.incoterm_id} onChange={e => setHeaderForm({...headerForm, incoterm_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {incoterms.map(i => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                    <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Agentes e Parceiros</p>
                  </div>
                  <div>
                    <label className={labelClass}>Agente Internacional</label>
                    <select value={headerForm.international_agent_id} onChange={e => setHeaderForm({...headerForm, international_agent_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {agentOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Agente Desconsolidador</label>
                    <select value={headerForm.deconsolidator_agent_id} onChange={e => setHeaderForm({...headerForm, deconsolidator_agent_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {agentOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Terceiro Comissionado</label>
                    <select value={headerForm.commissioned_third_party_id} onChange={e => setHeaderForm({...headerForm, commissioned_third_party_id: e.target.value})}
                      className={inputClass}>
                      <option value="">— Nenhum —</option>
                      {thirdPartyOptions.map(a => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                    <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Mercadoria e Seguro</p>
                  </div>
                  <div>
                    <label className={labelClass}>Tipo da Mercadoria</label>
                    <input type="text" value={headerForm.cargo_nature} onChange={e => setHeaderForm({...headerForm, cargo_nature: e.target.value})}
                      placeholder="ex: Carga geral, eletrônicos..."
                      className={inputClass}/>
                  </div>
                  <div className="flex items-end gap-3 pb-2">
                    <button type="button"
                      onClick={() => setHeaderForm({...headerForm, has_insurance: !headerForm.has_insurance})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${headerForm.has_insurance ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${headerForm.has_insurance ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className="text-sm text-gray-700">Seguro {headerForm.has_insurance ? 'Sim' : 'Não'}</span>
                  </div>
                  {headerForm.has_insurance && (
                    <div className="col-span-2">
                      <label className={labelClass}>Seguradora</label>
                      <select value={headerForm.insurer_id} onChange={e => setHeaderForm({...headerForm, insurer_id: e.target.value})}
                        className={inputClass}>
                        <option value="">— Selecione —</option>
                        {insurerOptions.map(i => <option key={i.id} value={i.id}>{i.nickname || i.company_name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className={labelClass}>Observações da Proposta</label>
                    <textarea value={headerForm.proposal_notes} onChange={e => setHeaderForm({...headerForm, proposal_notes: e.target.value})} rows={2}
                      placeholder="Uso interno"
                      className={inputClass}/>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Observações do Cliente</label>
                    <textarea value={headerForm.client_notes} onChange={e => setHeaderForm({...headerForm, client_notes: e.target.value})} rows={2}
                      placeholder="Aparece no PDF enviado ao cliente"
                      className={inputClass}/>
                  </div>
                </div>

                {msg && <p className="text-sm text-red-500">{msg}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="submit"
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition">
                    Próximo →
                  </button>
                  <button type="button" onClick={closeForm}
                    className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {productMode === null && (
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setProductMode('manual')}
                      className="text-left border border-gray-200 rounded-xl p-5 hover:border-gray-900 hover:shadow-sm transition">
                      <p className="text-sm font-semibold text-gray-900 mb-1">✏️ Inserir manualmente</p>
                      <p className="text-xs text-gray-500">Preenche os dados do primeiro produto do zero. Rotas e fretes você adiciona na tela seguinte.</p>
                    </button>
                    <button type="button" onClick={() => setProductMode('pricing')}
                      className="text-left border border-gray-200 rounded-xl p-5 hover:border-gray-900 hover:shadow-sm transition">
                      <p className="text-sm font-semibold text-gray-900 mb-1">📋 Puxar do Pricing</p>
                      <p className="text-xs text-gray-500">Escolhe uma tarifa cadastrada e o sistema já pré-preenche produto, rota e frete pra você revisar.</p>
                    </button>
                  </div>
                )}

                {productMode === 'manual' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Tipo de Operação</label>
                        <select value={productForm.operation_type_id} onChange={e => setProductForm({...productForm, operation_type_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {operationTypes.map((o: any) => <option key={o.id} value={o.id}>{o.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Tipo de Carga</label>
                        <select value={productForm.cargo_type_id} onChange={e => setProductForm({...productForm, cargo_type_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {cargoTypes.map((c: any) => <option key={c.id} value={c.id}>{c.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Peso Bruto (kg)</label>
                        <input type="number" step="0.01" value={productForm.gross_weight} onChange={e => setProductForm({...productForm, gross_weight: e.target.value})} className={inputClass}/>
                      </div>
                      <div>
                        <label className={labelClass}>Peso Taxável (kg)</label>
                        <input type="number" step="0.01" value={productForm.chargeable_weight} onChange={e => setProductForm({...productForm, chargeable_weight: e.target.value})} className={inputClass}/>
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Observações</label>
                        <textarea value={productForm.notes} onChange={e => setProductForm({...productForm, notes: e.target.value})} rows={2} className={inputClass}/>
                      </div>
                    </div>
                    <button type="button" onClick={() => setProductMode(null)} className="text-xs text-gray-500 hover:text-gray-900">← Trocar modo</button>
                  </div>
                )}

                {productMode === 'pricing' && !selectedRate && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input type="text" value={pricingSearch} onChange={e => setPricingSearch(e.target.value)}
                        placeholder="Buscar por agente, origem ou destino..."
                        className={`${inputClass} flex-1`}/>
                      <select value={pricingModalFilter} onChange={e => setPricingModalFilter(e.target.value)} className={`${inputClass} max-w-[160px]`}>
                        <option value="">Todos os modais</option>
                        <option value="air">Aéreo</option>
                        <option value="sea">Marítimo</option>
                      </select>
                    </div>
                    <div className="border border-gray-100 rounded-xl max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {filteredFreightRates.length === 0 && (
                        <p className="text-xs text-gray-400 p-4 text-center">Nenhuma tarifa encontrada.</p>
                      )}
                      {filteredFreightRates.map((r: any) => (
                        <button key={r.id} type="button" onClick={() => pickPricingRow(r)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex justify-between items-center">
                          <span className="text-sm text-gray-900">
                            {r.agent_name} · {r.modal === 'air' ? 'Aéreo' : 'Marítimo'} · {r.origin || '—'} → {r.destination || '—'}
                          </span>
                          <span className="text-xs text-gray-400">{r.currency_code}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setProductMode(null)} className="text-xs text-gray-500 hover:text-gray-900">← Trocar modo</button>
                  </div>
                )}

                {productMode === 'pricing' && selectedRate && !selectedBracketKey && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      <strong>{selectedRate.agent_name}</strong> · {selectedRate.origin} → {selectedRate.destination}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">Escolha a faixa de tarifa a usar:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(selectedRate.modal === 'air' ? AIR_RATE_FIELDS : SEA_RATE_FIELDS)
                        .filter(f => selectedRate[f.key] !== null && selectedRate[f.key] !== undefined && selectedRate[f.key] !== '')
                        .map(f => (
                          <button key={f.key} type="button" onClick={() => pickBracket(f.key, f.label, selectedRate[f.key])}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-left hover:border-gray-900 transition">
                            <p className="text-xs text-gray-500">{f.label}</p>
                            <p className="text-sm font-medium text-gray-900">{selectedRate.currency_code} {Number(selectedRate[f.key]).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </button>
                        ))}
                    </div>
                    {(selectedRate.modal === 'air' ? AIR_RATE_FIELDS : SEA_RATE_FIELDS).filter(f => selectedRate[f.key]).length === 0 && (
                      <p className="text-xs text-amber-600">Essa tarifa não tem nenhuma faixa de valor preenchida.</p>
                    )}
                    <button type="button" onClick={() => setSelectedRate(null)} className="text-xs text-gray-500 hover:text-gray-900">← Escolher outra tarifa</button>
                  </div>
                )}

                {productMode === 'pricing' && selectedRate && selectedBracketKey && (
                  <div className="space-y-4">
                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                      Pré-preenchido a partir do Pricing ({selectedRate.agent_name} · {freightForm._bracketLabel}). Revise antes de salvar.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Tipo de Carga</label>
                        <select value={productForm.cargo_type_id} onChange={e => setProductForm({...productForm, cargo_type_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {cargoTypes.map((c: any) => <option key={c.id} value={c.id}>{c.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Tipo de Operação</label>
                        <select value={productForm.operation_type_id} onChange={e => setProductForm({...productForm, operation_type_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {operationTypes.map((o: any) => <option key={o.id} value={o.id}>{o.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Origem</label>
                        <select value={routeForm.origin_id || ''} onChange={e => setRouteForm({...routeForm, origin_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhuma —</option>
                          {portsAirports.map((p: any) => <option key={p.id} value={p.id}>{p.iata_code || p.un_locode} — {p.name}</option>)}
                        </select>
                        {!routeForm.origin_id && <p className="text-xs text-amber-600 mt-1">Não encontrei "{selectedRate.origin}" cadastrado — selecione manualmente.</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Destino</label>
                        <select value={routeForm.destination_id || ''} onChange={e => setRouteForm({...routeForm, destination_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {portsAirports.map((p: any) => <option key={p.id} value={p.id}>{p.iata_code || p.un_locode} — {p.name}</option>)}
                        </select>
                        {!routeForm.destination_id && <p className="text-xs text-amber-600 mt-1">Não encontrei "{selectedRate.destination}" cadastrado — selecione manualmente.</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Agente da Rota</label>
                        <select value={routeForm.route_agent_id || ''} onChange={e => setRouteForm({...routeForm, route_agent_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {agentOptions.map((a: any) => <option key={a.id} value={a.id}>{a.nickname || a.company_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Moeda</label>
                        <select value={routeForm.currency_id || ''} onChange={e => setRouteForm({...routeForm, currency_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhuma —</option>
                          {currencies.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Equipamento</label>
                        <select value={freightForm.equipment_type_id || ''} onChange={e => setFreightForm({...freightForm, equipment_type_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhum —</option>
                          {equipmentTypes.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Unidade de Cobrança</label>
                        <select value={freightForm.billing_unit_id || ''} onChange={e => setFreightForm({...freightForm, billing_unit_id: e.target.value})} className={inputClass}>
                          <option value="">— Nenhuma —</option>
                          {billingUnits.map((b: any) => <option key={b.id} value={b.id}>{b.label_pt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Quantidade</label>
                        <input type="number" value={freightForm.quantity || ''} onChange={e => setFreightForm({...freightForm, quantity: e.target.value})} className={inputClass}/>
                      </div>
                      <div>
                        <label className={labelClass}>Tarifa de Compra</label>
                        <input type="number" step="0.01" value={freightForm.purchase_rate || ''} onChange={e => setFreightForm({...freightForm, purchase_rate: e.target.value})} className={inputClass}/>
                      </div>
                      <div>
                        <label className={labelClass}>Tarifa de Venda</label>
                        <input type="number" step="0.01" value={freightForm.sale_rate || ''} onChange={e => setFreightForm({...freightForm, sale_rate: e.target.value})} placeholder="Defina a margem" className={inputClass}/>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedBracketKey('')} className="text-xs text-gray-500 hover:text-gray-900">← Escolher outra faixa</button>
                  </div>
                )}

                {msg && <p className="text-sm text-red-500">{msg}</p>}

                <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 transition">
                    ← Voltar
                  </button>
                  <button type="button" onClick={handleFinalSubmit} disabled={saving || (productMode === 'pricing' && selectedRate && !selectedBracketKey)}
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {saving ? 'Criando...' : 'Criar Proposta'}
                  </button>
                  {productMode === null && (
                    <button type="button" onClick={handleFinalSubmit} disabled={saving}
                      className="border border-gray-200 text-gray-500 rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 transition disabled:opacity-50">
                      Pular por agora
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
