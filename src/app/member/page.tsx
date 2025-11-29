'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { 
  Loader2, Sun, CheckCircle, 
  CreditCard, Upload, LogOut, History, ChevronRight, ChevronLeft, Wifi
} from 'lucide-react'
import { FadeIn, SlideIn, ScaleIn, ScrollReveal } from '@/components/AnimatedSection'
import { toast } from 'sonner'

// --- TIPE DATA ---
type Plan = {
  id: string
  name: string
  price: number
  duration_days: number
  description: string
}

type Transaction = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  amount: number
  plans: { name: string }
}

// --- HELPER ---
function formatHeaderDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', day: 'numeric', month: 'short'
  }).format(date).toUpperCase()
}

function formatIndoDate(dateString: string): string {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (date.getFullYear() < 2000) return '-' 
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: '2-digit' // Format pendek ala kartu kredit (20 Nov 25)
    }).format(date)
}

// Helper untuk format ID Member jadi ala nomor kartu (0000 0000)
function formatCardId(id: string): string {
    if (!id) return '0000 0000 0000'
    // Ambil 12 karakter pertama UUID dan pisah per 4 digit
    const clean = id.replace(/-/g, '').substring(0, 12).toUpperCase()
    return clean.match(/.{1,4}/g)?.join(' ') || clean
}

export default function MemberDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- STATE ---
  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // --- FETCH DATA ---
  useEffect(() => {
    const getData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: profile } = await supabase
          .schema('members')
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        setUser(profile)

        const { data: plansData } = await supabase
          .schema('members')
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true })
        setPlans(plansData || [])

        const { data: trxData } = await supabase
          .schema('members')
          .from('transactions')
          .select('*, plans(name)')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
        setTransactions(trxData || [])
      }
      setPageLoading(false)
    }
    getData()
  }, [])

  // --- UPLOAD LOGIC ---
  const handleBuyPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan || !file || !user) return
    setLoading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase
        .schema('members')
        .from('transactions')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          amount: selectedPlan.price,
          proof_url: publicUrl,
          status: 'PENDING'
        })
      if (insertError) throw insertError

      toast.success('✅ Bukti pembayaran berhasil dikirim!')
      setTimeout(() => window.location.reload(), 1500)

    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- SCROLL BUTTONS ---
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 320;
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }

  if (pageLoading || !user) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="text-indigo-500 animate-spin w-10 h-10" />
    </div>
  )

  const currentDate = new Date()
  const expiredDateObj = new Date(user.expired_at)
  const daysLeft = expiredDateObj > currentDate 
    ? Math.ceil((expiredDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-24 font-sans selection:bg-indigo-500/30">
      
      {/* --- HEADER --- */}
      <FadeIn className="flex justify-between items-center mb-8">
        <SlideIn>
            <div className="flex items-center gap-2 mb-1">
                <Sun className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider">
                {formatHeaderDate(currentDate)}
                </span>
            </div>
            <h1 className="text-2xl font-bold text-white">
                Hi, {user.name.split(' ')[0]}
            </h1>
        </SlideIn>
        <FadeIn delay={0.2}>
        <button onClick={handleLogout} className="p-3 bg-[#151515] rounded-full text-gray-400 hover:text-red-500 hover:bg-[#222] transition-all">
            <LogOut size={18} />
        </button>
        </FadeIn>
      </FadeIn>

      {/* --- EXCLUSIVE VIP MEMBER CARD --- */}
      <ScaleIn delay={0.3} className="flex justify-center mb-12 perspective-1000">
        <div className="relative w-full max-w-[400px] aspect-[1.58/1] group transition-transform duration-500 hover:scale-[1.02]">
            
            {/* Glow Effect Behind Card */}
            <div className="absolute -inset-1 bg-linear-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-1xl blur-md opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            
            {/* Card Container */}
            <div className="relative w-full h-full rounded-[20px] bg-linear-to-br from-[#1a1a1a] to-[#050505] border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between p-6 md:p-7">
                
                {/* Background Noise Texture & Shine */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-linear-to-br from-white/5 via-transparent to-transparent rotate-45 pointer-events-none"></div>

                {/* --- CARD TOP --- */}
                <div className="flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-white font-bold text-lg tracking-widest drop-shadow-md italic">JJ FITNESS</h2>
                        <p className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] uppercase">
                            {user.is_active ? 'Premium Access' : 'Membership Expired'}
                        </p>
                    </div>
                    {/* Logo di Kanan Atas */}
                    <div className="w-10 h-10 relative opacity-90">
                         <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                    </div>
                </div>

                {/* --- CARD MIDDLE (CHIP) --- */}
                <div className="flex items-center gap-4 z-10 my-auto">
                    {/* Chip Sim Card Style */}
                    <div className="w-10 h-8 rounded-md bg-linear-to-br from-yellow-200 via-yellow-400 to-yellow-600 border border-yellow-600 shadow-inner relative overflow-hidden">
                         <div className="absolute inset-0 border border-black/20 rounded-md"></div>
                         <div className="absolute left-[30%] top-0 bottom-0 w-1px bg-black/20"></div>
                         <div className="absolute top-[30%] left-0 right-0 h-1px bg-black/20"></div>
                         <div className="absolute bottom-[30%] left-0 right-0 h-1px bg-black/20"></div>
                    </div>
                    {/* Contactless Icon */}
                    <Wifi className="text-white/50 rotate-90 w-6 h-6" />
                </div>

                {/* --- CARD BOTTOM --- */}
                <div className="z-10">
                    {/* Member ID Number */}
                    <div className="text-xl md:text-2xl font-mono text-white/90 tracking-widest shadow-black drop-shadow-md mb-3">
                        {formatCardId(user.id)}
                    </div>

                    <div className="flex justify-between items-end">
                        {/* Name */}
                        <div>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">MEMBER NAME</p>
                            <p className="text-sm font-bold text-white uppercase tracking-wide">{user.name}</p>
                        </div>
                        
                        {/* Expiry */}
                        <div className="text-right">
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">VALID THRU</p>
                            <p className="text-sm font-mono font-bold text-white">
                                {user.is_active ? formatIndoDate(user.expired_at) : 'EXPIRED'}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </ScaleIn>

      {/* --- PLAN CAROUSEL --- */}
      <ScrollReveal className="mb-10">
        <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                Pilih Paket
            </h2>
            <div className="flex gap-2">
                <button onClick={() => scroll('left')} className="p-1.5 rounded-full bg-[#151515] text-gray-400 hover:text-white"><ChevronLeft size={16} /></button>
                <button onClick={() => scroll('right')} className="p-1.5 rounded-full bg-[#151515] text-gray-400 hover:text-white"><ChevronRight size={16} /></button>
            </div>
        </div>
        
        <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto p-4 -mx-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {plans.map((plan) => (
                <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`
                        min-w-[85%] md:min-w-[320px] snap-center 
                        p-6 rounded-2xl border cursor-pointer transition-all duration-300
                        flex flex-col justify-between relative overflow-hidden
                        ${selectedPlan?.id === plan.id 
                            ? 'bg-indigo-900/20 border-indigo-500 scale-[1.02] shadow-xl shadow-indigo-500/20 z-10'
                            : 'bg-[#0A0A0A] border-[#222] hover:border-gray-600 hover:scale-[1.01]'}
                    `}
                >
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">MEMBERSHIP</div>
                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                        <p className="text-gray-400 text-xs line-clamp-2">{plan.description}</p>
                    </div>
                    
                    <div className="mt-6">
                        <div className="text-2xl font-bold text-indigo-400">
                            Rp {plan.price.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-medium">
                            Durasi: <span className="text-white">{plan.duration_days} Hari</span>
                        </div>
                    </div>

                    {selectedPlan?.id === plan.id && (
                        <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
                                <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </ScrollReveal>

      {/* --- FORM UPLOAD --- */}
      {selectedPlan && (
        <FadeIn className="bg-[#0A0A0A] border border-indigo-500/30 rounded-2xl p-6 mb-10 shadow-2xl shadow-black">
            <h3 className="text-white font-bold mb-1">Konfirmasi & Bayar</h3>
            <p className="text-gray-500 text-xs mb-4">Upload bukti transfer untuk paket <span className="text-indigo-400">{selectedPlan.name}</span></p>
            
            <form onSubmit={handleBuyPlan} className="space-y-4">
                <div className="relative group">
                    <div className="border-2 border-dashed border-[#333] rounded-xl h-32 flex flex-col items-center justify-center group-hover:border-indigo-500 transition-colors bg-[#050505]">
                        <Upload className="w-6 h-6 text-gray-500 mb-2 group-hover:text-indigo-400" />
                        <p className="text-xs text-gray-400">
                            {file ? file.name : 'Tap to upload receipt'}
                        </p>
                    </div>
                    <input 
                        type="file" 
                        accept="image/*"
                        required
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        type="button" 
                        onClick={() => {setSelectedPlan(null); setFile(null)}}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-[#151515] text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-2 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Kirim Bukti'}
                    </button>
                </div>
            </form>
        </FadeIn>
      )}

      {/* --- RIWAYAT TRANSAKSI --- */}
      <ScrollReveal>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" /> Riwayat Transaksi
        </h3>
        
        <div className="space-y-3">
            {transactions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#222] rounded-xl">
                    <p className="text-gray-600 text-sm">Belum ada riwayat transaksi.</p>
                </div>
            ) : (
                transactions.map((trx) => (
                    <div key={trx.id} className="bg-[#0F0F0F] p-5 rounded-xl border border-[#1F1F1F] flex justify-between items-center">
                        <div>
                            <div className="text-white font-bold text-sm mb-1">{trx.plans?.name}</div>
                            <div className="text-gray-500 text-xs">
                                {new Date(trx.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-indigo-400 font-bold text-sm mb-1">
                                Rp {trx.amount.toLocaleString('id-ID')}
                            </div>
                            {trx.status === 'PENDING' && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded font-bold tracking-wider">PENDING</span>}
                            {trx.status === 'APPROVED' && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded font-bold tracking-wider">SUKSES</span>}
                            {trx.status === 'REJECTED' && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold tracking-wider">GAGAL</span>}
                        </div>
                    </div>
                ))
            )}
        </div>
      </ScrollReveal>
      
    </main>
  )
}