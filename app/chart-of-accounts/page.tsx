'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'accounts' | 'costcenters'>('accounts')
  const [search, setSearch] = useState('')
  const [filterCC, setFilterCC] = useState('')
  const [filterType, setFilterType] = useState('')

  // Account form
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editAccount, setEditAccount] = useState<any>(null)
  const [accountForm, setAccountForm] = useState<any>({
    cost_center_id: '', code: '', description_pt: '', description_en: '',
    acronym_company: '', acronym_agent: '', transaction_type: '', is_active: true,
  })
  const [accountMsg, setAccountMsg] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)

  // Cost center form
  const [showCCForm, setShowCCForm] = useState(false)
  const [editCC, setEditCC] = useState<any>(null)
  const [ccForm, setCcForm] = useState({ code: '', name: '', is_active: true })
  const [ccMsg, setCcMsg] = useState('')
  const [ccLoading, setCcLoading] = useState(false)

  // Select all / delete
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedCCs, setSelectedCCs] = useState<string[]>([])

  const TRANSACTION_TYPES = ['Administrativo', 'Financeiro', 'Operacional', 'Serviço', 'Serviço Internacional']

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { router.push('/'); return }
    setProfile(p)

    const { data: cc } = await supabase.from('cost_centers').select('*').order('name')
    setCostCenters(cc ?? [])

    const { data: acc } = await supabase
      .from('chart_of_accounts')
      .select('*, cost_center:cost_centers(name)')
      .order('description_pt')
    setAccounts(acc ?? [])

    setLoading(false)
  }

  // ---- ACCOUNTS ----
  function openNewAccount() {
    setEditAccount(null)
    setAccountForm({ cost_center_id: '', code: '', description_pt: '', description_en: '', acronym_company: '', acronym_agent: '', transaction_type: '', is_active: true })
    setAccountMsg('')
    setShowAccountForm(true)
  }

  function openEditAccount(a: any) {
    setEditAccount(a)
    setAccountForm({
      cost_center_id:  a.cost_center_id  ?? '',
      code:            a.code            ?? '',
      description_pt:  a.description_pt  ?? '',
      description_en:  a.description_en  ?? '',
      acronym_company: a.acronym_company ?? '',
      acronym_agent:   a.acronym_agent   ?? '',
      transaction_type: a.transaction_type ?? '',
      is_active:       a.is_active       ?? true,
    })
    setAccountMsg('')
    setShowAccountForm(true)
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setAccountLoading(true)
    setAccountMsg('')

    const payload = {
      cost_center_id:   accountForm.cost_center_id  || null,
      code:             accountForm.code             || null,
      description_pt:   accountForm.description_pt,
      description_en:   accountForm.description_en   || null,
      acronym_company:  accountForm.acronym_company  || null,
      acronym_agent:    accountForm.acronym_agent    || null,
      transaction_type: accountForm.transaction_type || null,
      is_active:        accountForm.is_active,
    }

    if (editAccount) {
      const { error } = await supabase.from('chart_of_accounts').update(payload).eq('id', editAccount.id)
      if (error) { setAccountMsg('Error saving'); setAccountLoading(false); return }
    } else {
      const { error } = await supabase.from('chart_of_accounts').insert(payload)
      if (error) { setAccountMsg('Error saving'); setAccountLoading(false); return }
    }

    setAccountMsg('Saved!')
    await loadData()
    setTimeout(() => setShowAccountForm(false), 800)
    setAccountLoading(false)
  }

  async function deleteSelectedAccounts() {
    if (!selectedAccounts.length) return
    if (!confirm(`Delete ${selectedAccounts.length} account(s)?`)) return
    await supabase.from('chart_of_accounts').delete().in('id', selectedAccounts)
    setSelectedAccounts([])
    await loadData()
  }

  async function deleteAllAccounts() {
    if (!confirm('Delete ALL chart of accounts? This cannot be undone.')) return
    await supabase.from('chart_of_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setSelectedAccounts([])
    await loadData()
  }

  // ---- COST CENTERS ----
  function openNewCC() {
    setEditCC(null)
    setCcForm({ code: '', name: '', is_active: true })
    setCcMsg('')
    setShowCCForm(true)
  }

  function openEditCC(cc: any) {
    setEditCC(cc)
    setCcForm({ code: cc.code, name: cc.name, is_active: cc.is_active })
    setCcMsg('')
    setShowCCForm(true)
  }

  async function handleSaveCC(e: React.FormEvent) {
    e.preventDefault()
    setCcLoading(true)
    setCcMsg('')

    if (editCC) {
      const { error } = await supabase.from('cost_centers').update(ccForm).eq('id', editCC.id)
      if (error) { setCcMsg('Error saving'); setCcLoading(false); return }
    } else {
      const { error } = await supabase.from('cost_centers').insert(ccForm)
      if (error) { setCcMsg('Error saving'); setCcLoading(false); return }
    }

    setCcMsg('Saved!')
    await loadData()
    setTimeout(() => setShowCCForm(false), 800)
    setCcLoading(false)
  }

  async function deleteSelectedCCs() {
    if (!selectedCCs.length) return
    if (!confirm(`Delete ${selectedCCs.length} cost center(s)?`)) return
    await supabase.from('cost_centers').delete().in('id', selectedCCs)
    setSelectedCCs([])
    await loadData()
  }

  // ---- FILTERS ----
  const filteredAccounts = accounts.filter(a => {
    const matchSearch = !search ||
      a.description_pt?.toLowerCase().includes(search.toLowerCase()) ||
      a.code?.includes(search) ||
      a.acronym_company?.toLowerCase().includes(search.toLowerCase())
    const matchCC = !filterCC || a.cost_center_id === filterCC
    const matchType = !filterType || a.transaction_type === filterType
    return matchSearch && matchCC && matchType
  })

  const filteredCCs = costCenters.filter(cc =>
    !search || cc.name?.toLowerCase().includes(search.toLowerCase()) || cc.code?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">Brisk System</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Chart of Accounts</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-900 transition">← Back</button>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto">

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-100">
          <button onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${activeTab === 'accounts' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Chart of Accounts ({accounts.length})
          </button>
          <button onClick={() => setActiveTab('costcenters')}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${activeTab === 'costcenters' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Cost Centers ({costCenters.length})
          </button>
        </div>

        {/* ======= ACCOUNTS TAB ======= */}
        {activeTab === 'accounts' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-3 flex-wrap">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search description, code, acronym..."
                  className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-64"/>
                <select value={filterCC} onChange={e => setFilterCC(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">All Cost Centers</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">All Types</option>
                  {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                {selectedAccounts.length > 0 && (
                  <button onClick={deleteSelectedAccounts}
                    className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg transition">
                    Delete Selected ({selectedAccounts.length})
                  </button>
                )}
                {profile?.role === 'admin' && (
                  <button onClick={deleteAllAccounts}
                    className="text-sm text-red-400 hover:text-red-600 border border-red-100 px-3 py-2 rounded-lg transition">
                    Clear All
                  </button>
                )}
                <button onClick={openNewAccount}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                  + New Account
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3">
                      <input type="checkbox"
                        checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                        onChange={e => setSelectedAccounts(e.target.checked ? filteredAccounts.map(a => a.id) : [])}/>
                    </th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Code</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Description (PT)</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Description (EN)</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Cost Center</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Type</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">CIA</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Agent</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <input type="checkbox"
                          checked={selectedAccounts.includes(a.id)}
                          onChange={e => setSelectedAccounts(e.target.checked ? [...selectedAccounts, a.id] : selectedAccounts.filter(x => x !== a.id))}/>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.code || '—'}</td>
                      <td className="px-4 py-3 text-gray-900">{a.description_pt}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.description_en || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.cost_center?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          a.transaction_type === 'Operacional' ? 'bg-blue-100 text-blue-700' :
                          a.transaction_type === 'Serviço' || a.transaction_type === 'Serviço Internacional' ? 'bg-green-100 text-green-700' :
                          a.transaction_type === 'Financeiro' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{a.transaction_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.acronym_company || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.acronym_agent || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditAccount(a)} className="text-xs text-gray-500 hover:text-gray-900 transition">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">No accounts found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredAccounts.length} of {accounts.length} accounts</p>
          </>
        )}

        {/* ======= COST CENTERS TAB ======= */}
        {activeTab === 'costcenters' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search cost centers..."
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-64"/>
              <div className="flex gap-2">
                {selectedCCs.length > 0 && (
                  <button onClick={deleteSelectedCCs}
                    className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-2 rounded-lg transition">
                    Delete Selected ({selectedCCs.length})
                  </button>
                )}
                <button onClick={openNewCC}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                  + New Cost Center
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3">
                      <input type="checkbox"
                        checked={selectedCCs.length === filteredCCs.length && filteredCCs.length > 0}
                        onChange={e => setSelectedCCs(e.target.checked ? filteredCCs.map(c => c.id) : [])}/>
                    </th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Code</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Name</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCCs.map(cc => (
                    <tr key={cc.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <input type="checkbox"
                          checked={selectedCCs.includes(cc.id)}
                          onChange={e => setSelectedCCs(e.target.checked ? [...selectedCCs, cc.id] : selectedCCs.filter(x => x !== cc.id))}/>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{cc.code}</td>
                      <td className="px-4 py-3 text-gray-900">{cc.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${cc.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditCC(cc)} className="text-xs text-gray-500 hover:text-gray-900 transition">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {filteredCCs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No cost centers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{editAccount ? 'Edit Account' : 'New Account'}</h3>
              <button onClick={() => setShowAccountForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cost Center</label>
                  <select value={accountForm.cost_center_id} onChange={e => setAccountForm({...accountForm, cost_center_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— None —</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                  <input type="text" value={accountForm.code} onChange={e => setAccountForm({...accountForm, code: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description (PT) *</label>
                  <input type="text" value={accountForm.description_pt} onChange={e => setAccountForm({...accountForm, description_pt: e.target.value})} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description (EN)</label>
                  <input type="text" value={accountForm.description_en} onChange={e => setAccountForm({...accountForm, description_en: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
                  <select value={accountForm.transaction_type} onChange={e => setAccountForm({...accountForm, transaction_type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="">— None —</option>
                    {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Acronym CIA</label>
                  <input type="text" value={accountForm.acronym_company} onChange={e => setAccountForm({...accountForm, acronym_company: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Acronym Agent</label>
                  <input type="text" value={accountForm.acronym_agent} onChange={e => setAccountForm({...accountForm, acronym_agent: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button"
                    onClick={() => setAccountForm({...accountForm, is_active: !accountForm.is_active})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${accountForm.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${accountForm.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                  <span className="text-sm text-gray-700">{accountForm.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              {accountMsg && <p className={`text-sm ${accountMsg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{accountMsg}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={accountLoading}
                  className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {accountLoading ? 'Saving...' : editAccount ? 'Save Changes' : 'Create Account'}
                </button>
                <button type="button" onClick={() => setShowAccountForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Center Form Modal */}
      {showCCForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{editCC ? 'Edit Cost Center' : 'New Cost Center'}</h3>
              <button onClick={() => setShowCCForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSaveCC} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                <input type="text" value={ccForm.code} onChange={e => setCcForm({...ccForm, code: e.target.value})} required
                  placeholder="e.g. ADM-COMERCIAL"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={ccForm.name} onChange={e => setCcForm({...ccForm, name: e.target.value})} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
              </div>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setCcForm({...ccForm, is_active: !ccForm.is_active})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ccForm.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ccForm.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
                <span className="text-sm text-gray-700">{ccForm.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {ccMsg && <p className={`text-sm ${ccMsg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{ccMsg}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={ccLoading}
                  className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                  {ccLoading ? 'Saving...' : editCC ? 'Save Changes' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowCCForm(false)}
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