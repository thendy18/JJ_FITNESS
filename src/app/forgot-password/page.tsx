'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image' // Import Image
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Reset link sent. Please check your inbox or spam folder.')
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

        {/* Back Button */}
        <Link href="/login" className="flex items-center justify-center text-gray-400 hover:text-blue-400 text-sm transition-colors mb-2 group">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Back to Login
        </Link>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-gray-400 text-sm">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Success Alert */}
        {message && (
          <div className="p-4 text-sm text-green-200 bg-green-900/20 border border-green-800 rounded-xl flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 text-sm text-red-200 bg-red-900/20 border border-red-900 rounded-xl flex items-center gap-2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
            <input
              type="email"
              required
              placeholder="example@email.com"
              className="w-full p-3.5 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              suppressHydrationWarning={true}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-blue-500 focus:ring-4 focus:ring-indigo-900 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20 mt-4 border border-indigo-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}