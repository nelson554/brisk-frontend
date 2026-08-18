'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordClient() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Error updating password. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Brisk System</h1>
          <p className="text-gray-500 text-sm mt-1">Set your new password</p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">Password updated successfully!</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Minimum 10 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="••••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
