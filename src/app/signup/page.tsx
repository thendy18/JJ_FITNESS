// src/app/signup/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { FadeIn, SlideIn } from '@/components/AnimatedSection'
import { toast } from 'sonner'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // Validasi Input
    if (formData.phoneNumber.length < 10 || formData.phoneNumber.length > 15) {
      setErrorMsg('Nomor telepon tidak valid (harus 10-15 digit).')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setErrorMsg('Password harus memiliki minimal 8 karakter.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone_number: formData.phoneNumber, 
            role: 'USER',
          },
        },
      })

      if (error) throw error

      toast.success('✅ Registrasi Berhasil! Silakan login.')
      setTimeout(() => router.push('/login'), 1500)
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mendaftar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // 1. BACKGROUND UTAMA: Hitam Pekat (bg-black)
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
      
      {/* 2. KARTU FORM: Abu Sangat Gelap (bg-gray-900) + Border Tipis */}
      <FadeIn className="w-full max-w-md space-y-8 bg-[#000000] p-8 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-gray-800">
        
        <SlideIn delay={0.2} className="text-center space-y-2">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Sign Up
          </h2>
          <p className="text-gray-400 text-sm">
            Take the first step toward a stronger, healthier you </p>
        </SlideIn>

        {errorMsg && (
          <FadeIn className="p-4 text-sm text-red-200 bg-red-900/20 border border-red-900 rounded-xl flex items-center gap-2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errorMsg}
          </FadeIn>
        )}

        <FadeIn delay={0.4}>
        <form onSubmit={handleSignUp} className="space-y-5">
          
          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Name</label>
            {/* 3. INPUT: Hitam (bg-black) agar kontras dengan kartu abu-abu */}
            <input
              type="text"
              name="name"
              required
              placeholder="Insert your name"
              className="w-full p-3.5 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600"
              value={formData.name}
              onChange={handleChange}
              suppressHydrationWarning={true}
            />
          </div>

          {/* Email */}
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

          {/* No HP */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
            <input
              type="tel" 
              name="phoneNumber" 
              required
              placeholder="0812..."
              className="w-full p-3.5 rounded-xl bg-black text-white border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-600"
              value={formData.phoneNumber}
              onChange={handleChange}
              suppressHydrationWarning={true}
            />
          </div>

          {/* Password */}
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
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />  }
              </button>
            </div>
            <p className="text-xs text-gray-500 text-right px-1">Min. 8 characters</p>
          </div>

          {/* 4. TOMBOL: Tetap Biru Indigo sesuai tema "Biru" */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-blue-500 focus:ring-4 focus:ring-indigo-900 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20 mt-4 border border-indigo-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                Processing...
              </span>
            ) : (
              'Sign Up'
            )}
          </button>

          <p className="text-center text-gray-400 text-sm pt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline">
              Login
            </Link>
          </p>
        </form>
        </FadeIn>
      </FadeIn>
    </div>
  )
}