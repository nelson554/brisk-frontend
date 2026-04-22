'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'address' | 'commercial' | 'contacts' | 'rates' | 'documents' | 'instructions'>('info')
  const [contacts, setContacts] = useState<any[]>([{ name: '', job_title: '', email: '', phone: '', is_primary: true }])
  const [rates, setRates] = useState<any[]>([{ chart_of_account_id: '', description: '', currency_id: '', amount: '', is_mandatory: true }])
  const [documents, setDocuments] = useState<any[]>([])
  const [instructions, setInstructions] = useState<any[]>([{ title: '', modal: 'all', instructions: '' }])
  const [formMsg, setFormMsg] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [coaList, setCoaList] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const EMPTY_FORM = {
    nickname: '', company_name: '', cnpj: '', cpf: '', segment: '', phone: '',
    zip_code: '', address_street: '', address_number: '', address_complement: '',
    address_district: '', address_city: '', address_state: '', address_country: 'BRASIL',
    accounting_code: '', sales_rep_id: '', inside_user_id: '',
    spread_pct: '', payment_terms_days: '0', is_active: true, notes: '',
  }
  const [form, setForm] = useState<any>(EMPTY_FORM)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: c } = await supabase
      .from('clients')
      .select('*, contacts:client_contacts(*), rates:client_fixed_rates(*), documents:client_documents(*), instructions:client_shipping_instructions(*)')
      .order('nickname')
    setClients(c ?? [])

    const { data: pr } = await supabase
      .from('profiles').select('id, full_name').eq('is_active', true).order('full_name')
    setProfiles(pr ?? [])

    const { data: coa } = await supabase
      .from('chart_of_accounts')
      .select('id, code, description_pt, transaction_type')
      .eq('is_active', true)
      .in('transaction_type', ['Operacional', 'Serviço', 'Serviço Internacional'])
      .order('description_pt')
    setCoaList(coa ?? [])

    const { data: cur } = await supabase
      .from('currencies').select('id, code, name').eq('is_active', true).order('code')
    setCurrencies(cur ?? [])

    setLoading(false)
  }

  async function lookupCNPJ(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setCnpjLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lookup-cnpj`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: digits }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        setForm((f: any) => ({
          ...f,
          company_name: data.company_name ?? f.company_name,
          zip_code: data.zip_code ?? f.zip_code,
          address_street: data.street ?? f.address_street,
          address_number: data.street_number ?? f.address_number,
          address_complement: data.complement ?? f.address_complement,
          address_district: data.neighborhood ?? f.address_district,
          address_city: data.city ?? f.address_city,
          address_state: data.state ?? f.address_state,
          phone: data.phone ?? f.phone,
        }))
      }
    } catch {}
    setCnpjLoading(false)
  }

  function openNew() {
    setEditClient(null)
    setForm(EMPTY_FORM)
    setContacts([{ name: '', job_title: '', email: '', phone: '', is_primary: true }])
    setRates([{ chart_of_account_id: '', description: '', currency_id: '', amount: '', is_mandatory: true }])
    setDocuments([])
    setInstructions([{ title: '', modal: 'all', instructions: '' }])
    setActiveTab('info')
    setFormMsg('')
    setShowForm(true)
  }

  function openEdit(c: any) {
    setEditClient(c)
    setForm({
      nickname: c.nickname ?? '',
      company_name: c.company_name ?? '',
      cnpj: c.cnpj ?? '',
      cpf: c.cpf ?? '',
      segment: c.segment ?? '',
      phone: c.phone ?? '',
      zip_code: c.zip_code ?? '',
      address_street: c.address_street ?? '',
      address_number: c.address_number ?? '',
      address_complement: c.address_complement ?? '',
      address_district: c.address_district ?? '',
      address_city: c.address_city ?? '',
      address_state: c.address_state ?? '',
      address_country: c.address_country ?? 'BRASIL',
      accounting_code: c.accounting_code ?? '',
      sales_rep_id: c.sales_rep_id ?? '',
      inside_user_id: c.inside_user_id ?? '',
      spread_pct: c.spread_pct ? (c.spread_pct * 100).toFixed(2) : '',
      payment_terms_days: c.payment_terms_days ?? '0',
      is_active: c.is_active ?? true,
      notes: c.notes ?? '',
    })
    setContacts(c.contacts?.length ? c.contacts : [{ name: '', job_title: '', email: '', phone: '', is_primary: true }])
    setRates(c.rates?.length ? c.rates.map((r: any) => ({
      ...r, amount: r.amount ?? '', chart_of_account_id: r.chart_of_account_id ?? '', currency_id: r.currency_id ?? '',
    })) : [{ chart_of_account_id: '', description: '', currency_id: '', amount: '', is_mandatory: true }])
    setDocuments(c.documents ?? [])
    setInstructions(c.instructions?.length ? c.instructions : [{ title: '', modal: 'all', instructions: '' }])
    setActiveTab('info')
    setFormMsg('')
    setShowForm(true)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editClient?.id) {
      setFormMsg('Save the client first before uploading documents.')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)

    const filePath = `${editClient.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(filePath, file)

    if (uploadError) {
      setFormMsg('Error uploading file')
      setUploadLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: doc } = await supabase
      .from('client_documents')
      .insert({
        client_id: editClient.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        created_by: user?.id,
      })
      .select()
      .single()

    if (doc) setDocuments([...documents, doc])
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDeleteDocument(doc: any) {
    await supabase.storage.from('client-documents').remove([doc.file_path])
    await supabase.from('client_documents').delete().eq('id', doc.id)
    setDocuments(documents.filter(d => d.id !== doc.id))
  }

  async function downloadDocument(doc: any) {
    const { data } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormMsg('')

    const payload = {
      nickname: form.nickname,
      company_name: form.company_name,
      cnpj: form.cnpj.replace(/\D/g, '') || null,
      cpf: form.cpf.replace(/\D/g, '') || null,
      segment: form.segment || null,
      phone: form.phone || null,
      zip_code: form.zip_code.replace(/\D/g, '') || null,
      address_street: form.address_street || null,
      address_number: form.address_number || null,
      address_complement: form.address_complement || null,
      address_district: form.address_district || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      address_country: form.address_country || 'BRASIL',
      accounting_code: form.accounting_code || null,
      sales_rep_id: form.sales_rep_id || null,
      inside_user_id: form.inside_user_id || null,
      spread_pct: form.spread_pct ? parseFloat(form.spread_pct) / 100 : null,
      payment_terms_days: parseInt(form.payment_terms_days) || 0,
      is_active: form.is_active,
      notes: form.notes || null,
    }

    let clientId = editClient?.id
    if (editClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editClient.id)
      if (error) { setFormMsg('Error saving client'); setFormLoading(false); return }
    } else {
      const { data, error } = await supabase.from('clients').insert(payload).select('id').single()
      if (error || !data) { setFormMsg('Error saving client'); setFormLoading(false); return }
      clientId = data.id
    }

    // Contacts
    const validContacts = contacts.filter(c => c.name.trim())
    if (editClient) await supabase.from('client_contacts').delete().eq('client_id', clientId)
    if (validContacts.length > 0) {
      await supabase.from('client_contacts').insert(
        validContacts.map(c => ({ name: c.name, job_title: c.job_title, email: c.email, phone: c.phone, is_primary: c.is_primary, client_id: clientId }))
      )
    }

    // Rates
    const validRates = rates.filter(r => r.description.trim())
    if (editClient) await supabase.from('client_fixed_rates').delete().eq('client_id', clientId)
    if (validRates.length > 0) {
      await supabase.from('client_fixed_rates').insert(
        validRates.map(r => ({
          client_id: clientId,
          chart_of_account_id: r.chart_of_account_id || null,
          description: r.description,
          currency_id: r.currency_id || null,
          amount: r.amount ? parseFloat(r.amount) : null,
          is_mandatory: r.is_mandatory,
        }))
      )
    }

    // Shipping Instructions
    const validInstructions = instructions.filter(i => i.title.trim() && i.instructions.trim())
    if (editClient) await supabase.from('client_shipping_instructions').delete().eq('client_id', clientId)
    if (validInstructions.length > 0) {
      await supabase.from('client_shipping_instructions').insert(
        validInstructions.map(i => ({ ...i, client_id: clientId }))
      )
    }

    setFormMsg(editClient ? 'Client updated!' : 'Client created!')
    await loadData()
    setTimeout(() => setShowForm(false), 1000)
    setFormLoading(false)
  }

  async function toggleActive(c: any) {
    await supabase.from('clients').update({ is_active: !c.is_active }).eq('id', c.id)
    setClients(clients.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const filtered = clients.filter(c =>
    c.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj?.includes(search.replace(/\D/g, ''))
  )

  const tabs = [
    { key: 'info',         label: 'Basic Info' },
    { key: 'address',      label: 'Address' },
    { key: 'commercial',   label: 'Commercial' },
    { key: 'contacts',     label: 'Contacts' },
    { key: 'rates',        label: 'Fixed Rates' },
    { key: 'documents',    label: 'Documents' },
    { key: 'instructions', label: 'Shipping Instructions' },
  ] as const

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Clients</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Back</button>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Clients</h2>
            <p className="text-gray-500 text-sm mt-1">{clients.length} clients registered</p>
          </div>
          <button onClick={openNew} className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-800 transition">
            + New Client
          </button>
        </div>

        <div className="mb-6">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by nickname, company name or CNPJ..."
            className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-gray-500 font-medium">Nickname</th>
                <th className="px-6 py-4 text-gray-500 font-medium">Company</th>
                <th className="px-6 py-4 text-gray-500 font-medium">CNPJ</th>
                <th className="px-6 py-4 text-gray-500 font-medium">City</th>
                <th className="px-6 py-4 text-gray-500 font-medium">Spread</th>
                <th className="px-6 py-4 text-gray-500 font-medium">Terms</th>
                <th className="px-6 py-4 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-4 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.nickname}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{c.company_name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {c.cnpj ? c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{c.address_city ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {c.spread_pct ? `${(c.spread_pct * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{c.payment_terms_days ?? 0}d</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                        c.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => openEdit(c)} className="text-sm text-gray-500 hover:text-gray-900 transition">Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{editClient ? 'Edit Client' : 'New Client'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>

              {/* TAB: Basic Info */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nickname *</label>
                    <input type="text" value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Segment</label>
                    <input type="text" value={form.segment} onChange={e => setForm({...form, segment: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
                    <div className="flex gap-2 items-center">
                      <input type="text" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})}
                        onBlur={e => lookupCNPJ(e.target.value)} placeholder="00.000.000/0000-00"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                      {cnpjLoading && <span className="text-xs text-gray-400">Searching...</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                    <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                    <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accounting Code</label>
                    <input type="text" value={form.accounting_code} onChange={e => setForm({...form, accounting_code: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                </div>
              )}

              {/* TAB: Address */}
              {activeTab === 'address' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ZIP Code</label>
                    <input type="text" value={form.zip_code} onChange={e => setForm({...form, zip_code: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Street</label>
                    <input type="text" value={form.address_street} onChange={e => setForm({...form, address_street: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Number</label>
                    <input type="text" value={form.address_number} onChange={e => setForm({...form, address_number: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Complement</label>
                    <input type="text" value={form.address_complement} onChange={e => setForm({...form, address_complement: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
                    <input type="text" value={form.address_district} onChange={e => setForm({...form, address_district: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input type="text" value={form.address_city} onChange={e => setForm({...form, address_city: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <input type="text" value={form.address_state} onChange={e => setForm({...form, address_state: e.target.value})}
                      maxLength={2} placeholder="SP"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                    <input type="text" value={form.address_country} onChange={e => setForm({...form, address_country: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                </div>
              )}

              {/* TAB: Commercial */}
              {activeTab === 'commercial' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sales Rep (Internal)</label>
                    <select value={form.sales_rep_id} onChange={e => setForm({...form, sales_rep_id: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="">— None —</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Inside</label>
                    <select value={form.inside_user_id} onChange={e => setForm({...form, inside_user_id: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="">— None —</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Spread % (over PTAX)</label>
                    <input type="number" step="0.01" min="0" max="100"
                      value={form.spread_pct} onChange={e => setForm({...form, spread_pct: e.target.value})}
                      placeholder="3.00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                    <p className="text-xs text-gray-400 mt-1">Enter as percentage, e.g. 3 = 3%</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
                    <input type="number" value={form.payment_terms_days} onChange={e => setForm({...form, payment_terms_days: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 pt-4">
                    <button type="button"
                      onClick={() => setForm({...form, is_active: !form.is_active})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              )}

              {/* TAB: Contacts */}
              {activeTab === 'contacts' && (
                <div>
                  <div className="flex justify-end mb-3">
                    <button type="button"
                      onClick={() => setContacts([...contacts, { name: '', job_title: '', email: '', phone: '', is_primary: false }])}
                      className="text-xs text-gray-500 hover:text-gray-900 transition">+ Add Contact</button>
                  </div>
                  <div className="space-y-3">
                    {contacts.map((c, i) => (
                      <div key={i} className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Name</label>
                          <input type="text" value={c.name}
                            onChange={e => setContacts(contacts.map((x, j) => j === i ? {...x, name: e.target.value} : x))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Job Title</label>
                          <input type="text" value={c.job_title}
                            onChange={e => setContacts(contacts.map((x, j) => j === i ? {...x, job_title: e.target.value} : x))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Email</label>
                          <input type="email" value={c.email}
                            onChange={e => setContacts(contacts.map((x, j) => j === i ? {...x, email: e.target.value} : x))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Phone</label>
                            <input type="text" value={c.phone}
                              onChange={e => setContacts(contacts.map((x, j) => j === i ? {...x, phone: e.target.value} : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                          </div>
                          {contacts.length > 1 && (
                            <button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 text-xs pb-1.5">✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Fixed Rates */}
              {activeTab === 'rates' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-gray-500">Pre-defined charges automatically applied to this client's processes.</p>
                    <button type="button"
                      onClick={() => setRates([...rates, { chart_of_account_id: '', description: '', currency_id: '', amount: '', is_mandatory: true }])}
                      className="text-xs text-gray-500 hover:text-gray-900 transition">+ Add Rate</button>
                  </div>
                  <div className="space-y-3">
                    {rates.map((r, i) => (
                      <div key={i} className="grid grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Chart of Accounts</label>
                          <select value={r.chart_of_account_id}
                            onChange={e => {
                              const coa = coaList.find(c => c.id === e.target.value)
                              setRates(rates.map((x, j) => j === i ? { ...x, chart_of_account_id: e.target.value, description: coa?.description_pt ?? x.description } : x))
                            }}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                            <option value="">— Select —</option>
                            {coaList.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} - ` : ''}{c.description_pt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input type="text" value={r.description}
                            onChange={e => setRates(rates.map((x, j) => j === i ? {...x, description: e.target.value} : x))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Currency</label>
                          <select value={r.currency_id}
                            onChange={e => setRates(rates.map((x, j) => j === i ? {...x, currency_id: e.target.value} : x))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                            <option value="">—</option>
                            {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Amount</label>
                            <input type="number" step="0.01" value={r.amount}
                              onChange={e => setRates(rates.map((x, j) => j === i ? {...x, amount: e.target.value} : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                          </div>
                          {rates.length > 1 && (
                            <button type="button" onClick={() => setRates(rates.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 text-xs pb-1.5">✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Documents */}
              {activeTab === 'documents' && (
                <div>
                  {!editClient && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-4">
                      <p className="text-xs text-amber-700">Save the client first before uploading documents.</p>
                    </div>
                  )}
                  {editClient && (
                    <div className="mb-4">
                      <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden"/>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLoading}
                        className="bg-gray-900 text-white text-xs px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                        {uploadLoading ? 'Uploading...' : '+ Upload Document'}
                      </button>
                    </div>
                  )}
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-400">
                              {doc.file_type} · {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => downloadDocument(doc)}
                              className="text-xs text-blue-500 hover:text-blue-700 transition">Download</button>
                            <button type="button" onClick={() => handleDeleteDocument(doc)}
                              className="text-xs text-red-400 hover:text-red-600 transition">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Shipping Instructions */}
              {activeTab === 'instructions' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-gray-500">Pre-defined shipping instructions sent to agents for this client.</p>
                    <button type="button"
                      onClick={() => setInstructions([...instructions, { title: '', modal: 'all', instructions: '' }])}
                      className="text-xs text-gray-500 hover:text-gray-900 transition">+ Add Instruction</button>
                  </div>
                  <div className="space-y-4">
                    {instructions.map((inst, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Title</label>
                            <input type="text" value={inst.title}
                              onChange={e => setInstructions(instructions.map((x, j) => j === i ? {...x, title: e.target.value} : x))}
                              placeholder="e.g. Standard Import Instructions"
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Modal</label>
                            <select value={inst.modal}
                              onChange={e => setInstructions(instructions.map((x, j) => j === i ? {...x, modal: e.target.value} : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
                              <option value="all">All</option>
                              <option value="sea">Sea</option>
                              <option value="air">Air</option>
                              <option value="road">Road</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs text-gray-500">Instructions</label>
                            {instructions.length > 1 && (
                              <button type="button" onClick={() => setInstructions(instructions.filter((_, j) => j !== i))}
                                className="text-xs text-red-400 hover:text-red-600">Remove</button>
                            )}
                          </div>
                          <textarea value={inst.instructions}
                            onChange={e => setInstructions(instructions.map((x, j) => j === i ? {...x, instructions: e.target.value} : x))}
                            rows={5}
                            placeholder="Enter shipping instructions that will be sent to the agent..."
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formMsg && (
                <p className={`text-sm mt-4 ${formMsg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{formMsg}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={formLoading}
                  className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {formLoading ? 'Saving...' : editClient ? 'Save Changes' : 'Create Client'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}