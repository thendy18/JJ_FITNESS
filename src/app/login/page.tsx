// src/app/login/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image' // 1. Import Image
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .schema('members')
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        if (profileError) throw new Error('Gagal mengambil data profil.')

        setLoading(false)
        
        if (profileData?.role === 'ADMIN') {
          router.replace('/admin')
        } else {
          router.replace('/member')
        }
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Email atau password salah.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md space-y-6 bg-[#000000] p-8 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-800">
        
        {/* 2. LOGO AREA */}
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20">
             {/* Pastikan ada file logo.png di folder public */}
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
            Welcome Back
          </h2>
          <p className="text-gray-400 text-sm">
            Sign in to continue your journey
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 text-sm text-red-200 bg-red-900/20 border border-red-900 rounded-xl flex items-center gap-2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="contoh@email.com"
              className="w-full p-3.5 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600"
              value={formData.email}
              onChange={handleChange}
              suppressHydrationWarning={true}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                placeholder="••••••••"
                className="w-full p-3.5 pr-12 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600 group-hover:border-gray-700"
                value={formData.password}
                onChange={handleChange}
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
            
            {/* 3. LINK LUPA PASSWORD */}
            <div className="text-right px-1 pt-1">
              <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                Lupa Password?
              </Link>
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
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="text-center text-gray-400 text-sm pt-2">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}