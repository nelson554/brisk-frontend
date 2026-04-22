'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ROLE_COLORS: Record<string, string> = {
  admin:       'bg-purple-100 text-purple-700',
  commercial:  'bg-blue-100 text-blue-700',
  operational: 'bg-green-100 text-green-700',
  financial:   'bg-amber-100 text-amber-700',
}

const EMPTY_FORM = {
  full_name: '', cpf: '', birth_date: '', department: '',
  job_title: '', phone: '', language: 'en', role: 'operational',
  is_active: true, manager_id: '',
}

export default function UsersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'invitations'>('users')

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('operational')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>(EMPTY_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [editMsg, setEditMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (p?.role !== 'admin') { router.push('/dashboard'); return }
    setProfile(p)

    const { data: u } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(u ?? [])

    const { data: i } = await supabase
      .from('user_invitations').select('*').order('created_at', { ascending: false })
    setInvitations(i ?? [])

    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMsg('')

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setInviteMsg('Session expired. Please log in again.')
      setInviteLoading(false)
      return
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-invitation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      )

      const data = await res.json()
      if (!res.ok) {
        setInviteMsg(data.error ?? 'Error sending invitation')
      } else {
        setInviteMsg('Invitation sent successfully!')
        setInviteEmail('')
        const { data: i } = await supabase
          .from('user_invitations').select('*').order('created_at', { ascending: false })
        setInvitations(i ?? [])
      }
    } catch {
      setInviteMsg('Connection error. Please try again.')
    }

    setInviteLoading(false)
  }

  function openEdit(u: any) {
    setEditUser(u)
    setEditForm({
      full_name:  u.full_name  ?? '',
      cpf:        u.cpf        ?? '',
      birth_date: u.birth_date ?? '',
      department: u.department ?? '',
      job_title:  u.job_title  ?? '',
      phone:      u.phone      ?? '',
      language:   u.language   ?? 'en',
      role:       u.role       ?? 'operational',
      is_active:  u.is_active  ?? true,
      manager_id: u.manager_id ?? '',
    })
    setEditMsg('')
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditLoading(true)
    setEditMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:  editForm.full_name,
        cpf:        editForm.cpf        || null,
        birth_date: editForm.birth_date || null,
        department: editForm.department || null,
        job_title:  editForm.job_title  || null,
        phone:      editForm.phone      || null,
        language:   editForm.language,
        role:       editForm.role,
        is_active:  editForm.is_active,
        manager_id: editForm.manager_id || null,
      })
      .eq('id', editUser.id)

    if (error) {
      setEditMsg('Error updating user')
    } else {
      setEditMsg('User updated successfully!')
      await loadData()
      setTimeout(() => setShowEdit(false), 1000)
    }
    setEditLoading(false)
  }

  async function toggleActive(u: any) {
    await supabase
      .from('profiles')
      .update({ is_active: !u.is_active })
      .eq('id', u.id)
    setUsers(users.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
  }

  async function handleRevoke(id: string) {
    await supabase
      .from('user_invitations').update({ status: 'revoked' }).eq('id', id)
    setInvitations(inv => inv.map(i => i.id === id ? { ...i, status: 'revoked' } : i))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="text-lg font-semibold text-gray-900">
            Brisk System
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">User Management</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-900 transition">
          ← Back
        </button>
      </nav>

      <div className="px-8 py-10 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">Manage users and invitations</p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-800 transition"
          >
            + Invite User
          </button>
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Invite New User</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="colleague@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                    <option value="operational">Operational</option>
                    <option value="commercial">Commercial</option>
                    <option value="financial">Financial</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {inviteMsg && (
                  <p className={`text-sm ${inviteMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {inviteMsg}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={inviteLoading}
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button type="button" onClick={() => { setShowInvite(false); setInviteMsg('') }}
                    className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit User</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={editForm.full_name}
                      onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input type="text" value={editForm.cpf}
                      onChange={e => setEditForm({ ...editForm, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" value={editForm.birth_date}
                      onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input type="text" value={editForm.department}
                      onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                      placeholder="e.g. Operations"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input type="text" value={editForm.job_title}
                      onChange={e => setEditForm({ ...editForm, job_title: e.target.value })}
                      placeholder="e.g. Freight Coordinator"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input type="text" value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+55 11 99999-9999"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Direct Manager</label>
                    <select value={editForm.manager_id}
                      onChange={e => setEditForm({ ...editForm, manager_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="">— No manager —</option>
                      {users.filter(u => u.id !== editUser?.id).map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={editForm.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="operational">Operational</option>
                      <option value="commercial">Commercial</option>
                      <option value="financial">Financial</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select value={editForm.language}
                      onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 pt-1">
                    <button type="button"
                      onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className="text-sm text-gray-700">
                      {editForm.is_active ? 'Active — user can log in' : 'Inactive — access blocked'}
                    </span>
                  </div>
                </div>
                {editMsg && (
                  <p className={`text-sm ${editMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {editMsg}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={editLoading}
                    className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setShowEdit(false)}
                    className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {(['users', 'invitations'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px capitalize ${
                tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'users' ? `Active Users (${users.length})` : `Invitations (${invitations.length})`}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-gray-500 font-medium">Name</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Department</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Role</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      {u.job_title && <p className="text-xs text-gray-400">{u.job_title}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.department ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(u)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(u)}
                        className="text-sm text-gray-500 hover:text-gray-900 transition">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invitations Table */}
        {tab === 'invitations' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-gray-500 font-medium">Email</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Role</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Expires</th>
                  <th className="px-6 py-4 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(i => (
                  <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-900">{i.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[i.role]}`}>
                        {i.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        i.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                        i.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(i.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {i.status === 'pending' && (
                        <button onClick={() => handleRevoke(i.id)}
                          className="text-red-500 hover:text-red-700 text-xs transition">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}