'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
        setError('Password must be at least 8 characters')
        setLoading(false)
        return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password: password })

    if (error) {
      setError(error.message)
    } else {
      alert('Password updated successfully! Please login.')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md space-y-6 bg-[#000000] p-8 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-800">
        
        {/* LOGO AREA */}
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20">
             <Image 
               src="/logo.png" 
               alt="Logo Gym Master"
               fill
               className="object-contain"
               priority
             />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            New Password
          </h2>
          <p className="text-gray-400 text-sm">
            Create a new password for your account
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-200 bg-red-900/20 border border-red-900 rounded-xl flex items-center gap-2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">New Password</label>
            <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min. 8 Characters"
                  className="w-full p-3.5 pr-12 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600 group-hover:border-gray-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suppressHydrationWarning={true}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-800"
                >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-blue-500 focus:ring-4 focus:ring-indigo-900 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20 mt-4 border border-indigo-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                Saving...
              </span>
            ) : (
              'Save Password'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}