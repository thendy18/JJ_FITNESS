'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { 
  Loader2, Users, DollarSign, Bell, LogOut, 
  CheckCircle, XCircle, Eye, Calendar as CalendarIcon, Search,
  Edit, Trash2, PlusCircle, ChevronLeft, ChevronRight, Download, ChevronDown
} from 'lucide-react'
import { createMember, deleteMember, extendMemberManual, updateMemberFull } from './actions'
import Papa from 'papaparse' 

// --- TIPE DATA ---
type Transaction = {
  id: string
  amount: number
  proof_url: string
  status: string
  created_at: string
  profiles: { name: string; email: string; expired_at: string } | null 
  plans: { name: string; duration_days: number } | null 
}

type Member = {
  id: string
  name: string
  email: string
  phone_number: string
  role: string
  is_active: boolean
  expired_at: string
  member_type: string
  created_at: string
}

type Plan = {
    id: string
    name: string
    price: number
    duration_days: number
}

// Helper Format
const formatRupiah = (num: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const formatIndoDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (date.getFullYear() < 2000) return '-'
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview')
  const [loading, setLoading] = useState(true)
  
  // STATE TANGGAL & PICKER
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear()) // Tahun di dalam picker
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]) 
  const [stats, setStats] = useState({ pending: 0, members: 0, revenue: 0 })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [extendingMember, setExtendingMember] = useState<Member | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)
  
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [formAmount, setFormAmount] = useState(0) 
  const [createAmount, setCreateAmount] = useState(0) 
  const [extendDays, setExtendDays] = useState(30)
  const [manualPrice, setManualPrice] = useState(0)

  // --- FETCH DATA ---
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // 1. Transaksi
    const { data: trxData } = await supabase
      .schema('members')
      .from('transactions')
      .select(`*, profiles(name, email, expired_at), plans(name, duration_days)`)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
      .order('created_at', { ascending: false })

    if (trxData) {
        setTransactions(trxData.filter(t => t.status === 'PENDING') as any)
        const approvedTrx = trxData.filter(t => t.status === 'APPROVED')
        const monthlyRevenue = approvedTrx.reduce((sum, t) => sum + t.amount, 0)
        const { count: memberCount } = await supabase.schema('members').from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true)

        setStats({
            pending: trxData.filter(t => t.status === 'PENDING').length,
            members: memberCount || 0,
            revenue: monthlyRevenue
        })
    }

    // 2. Members
    const { data: memberData } = await supabase.schema('members').from('profiles').select('*').order('created_at', { ascending: false })
    if (memberData) setMembers(memberData as any)

    // 3. Plans
    const { data: plansData } = await supabase.schema('members').from('plans').select('*').eq('is_active', true)
    if (plansData) setAvailablePlans(plansData)

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [currentDate])

  // --- LOGIKA PICKER TANGGAL ---
  const togglePicker = () => {
      setPickerYear(currentDate.getFullYear())
      setIsPickerOpen(!isPickerOpen)
  }

  const handlePickerYearChange = (direction: 'prev' | 'next') => {
      setPickerYear(prev => direction === 'prev' ? prev - 1 : prev + 1)
  }

  const handleMonthSelect = (monthIndex: number) => {
      const newDate = new Date(currentDate)
      newDate.setFullYear(pickerYear)
      newDate.setMonth(monthIndex)
      setCurrentDate(newDate)
      setIsPickerOpen(false)
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  // Handlers Form
  const handleSelectPlanEdit = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value; setSelectedPlanId(id); 
      const plan = availablePlans.find(p => p.id === id); 
      if (plan) setFormAmount(plan.price); else setFormAmount(0)
  }
  const handleSelectPlanCreate = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value; const plan = availablePlans.find(p => p.id === id); 
      if (plan) setCreateAmount(plan.price); else setCreateAmount(0)
  }
  useEffect(() => {
      if (!isAddingMember && !editingMember) { setSelectedPlanId(''); setFormAmount(0); setCreateAmount(0) }
  }, [isAddingMember, editingMember])

  const handleExportCSV = async () => {
    if (!confirm('Download laporan?')) return
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const { data: reportData } = await supabase.schema('members').from('transactions').select(`created_at, amount, status, proof_url, profiles(name, email, expired_at), plans(name)`).eq('status', 'APPROVED').gte('created_at', startOfMonth).lte('created_at', endOfMonth).order('created_at', { ascending: true })
    if (!reportData || reportData.length === 0) { alert('Tidak ada data transaksi sukses.'); return }
    const csvData = reportData.map((trx: any) => {
        let paketName = trx.plans?.name || '-';
        if (trx.proof_url?.includes('MANUAL')) paketName = 'Manual (Cash)';
        return {
            'Tanggal': new Date(trx.created_at).toLocaleDateString('id-ID'),
            'Nama': trx.profiles?.name || 'Tanpa Nama',
            'Email': trx.profiles?.email || '-',
            'Paket': paketName,
            'Nominal': trx.amount,
            'Status': 'LUNAS'
        };
    })
    const total = reportData.reduce((sum, t) => sum + t.amount, 0)
    csvData.push({ 'Tanggal': '', 'Nama': '', 'Email': '', 'Paket': 'TOTAL', 'Nominal': total, 'Status': '' } as any)
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.setAttribute('download', `Laporan_${currentDate.toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  // Actions
  const handleApprove = async (trxId: string) => {
    if (!confirm('Setujui?')) return; setProcessingId(trxId)
    try { await supabase.rpc('approve_payment', { target_transaction_id: trxId }); alert('Berhasil!'); fetchData() } catch (err: any) { alert('Gagal: ' + err.message) } finally { setProcessingId(null) }
  }
  const handleReject = async (trxId: string) => {
    if (!confirm('Tolak?')) return; setProcessingId(trxId)
    try { await supabase.schema('members').from('transactions').update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', trxId); fetchData() } catch (err: any) { alert('Gagal: ' + err.message) } finally { setProcessingId(null) }
  }
  const handleDeleteMember = async (id: string) => {
    if (!confirm('Hapus permanen?')) return; 
    const result = await deleteMember(id); if (result?.error) alert('Gagal: ' + result.error); else { alert('Dihapus.'); fetchData() }
  }
  const handleUpdateMemberFull = async (formData: FormData) => {
    const result = await updateMemberFull(formData); if (result?.error) alert('Gagal: ' + result.error); else { alert('Sukses!'); setEditingMember(null); fetchData() }
  }
  const handleCreateMember = async (formData: FormData) => {
    const result = await createMember(formData); if (result?.error) alert('Gagal: ' + result.error); else { alert('Sukses!'); setIsAddingMember(false); fetchData() }
  }
  const handleManualExtend = async (e: React.FormEvent) => {
    e.preventDefault(); if (!extendingMember) return;
    const result = await extendMemberManual(extendingMember.id, extendDays, manualPrice);
    if (result?.error) alert(result.error); else { alert('Berhasil!'); setExtendingMember(null); setManualPrice(0); fetchData() }
  }
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingMember) return;
    const { error } = await supabase.schema('members').from('profiles').update({ name: editingMember.name, phone_number: editingMember.phone_number, member_type: editingMember.member_type }).eq('id', editingMember.id);
    if (error) alert(error.message); else { alert('Updated!'); setEditingMember(null); fetchData() }
  }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = memberFilter === 'all' ? true : memberFilter === 'active' ? m.is_active : !m.is_active
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 pb-20">
      {/* NAVBAR */}
      <nav className="border-b border-[#222] bg-[#0A0A0A]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10"><Image src="/logo.png" alt="Logo" fill className="object-contain" /></div>
            <div><h1 className="font-bold text-lg tracking-wider">ADMIN PANEL</h1><p className="text-[10px] text-gray-500 uppercase tracking-widest">Gym Master Control</p></div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex bg-[#111] p-1 rounded-lg border border-[#222]">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'overview' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Overview</button>
                <button onClick={() => setActiveTab('members')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'members' ? 'bg-[#222] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Manajemen Member</button>
             </div>
             <button onClick={handleLogout} className="p-2 hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors" suppressHydrationWarning={true}><LogOut size={20} /></button>
          </div>
        </div>
        <div className="md:hidden flex border-t border-[#222]">
            <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'overview' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}>Overview</button>
            <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'members' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}>Members</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 relative">
        
        {/* --- HEADER FILTER BULAN (DIPERBAIKI) --- */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-[#0F0F0F] p-4 rounded-2xl border border-[#222] gap-4 relative z-30">
            
            {/* Navigasi Tengah */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-center relative">
                {/* Tombol Prev Bulan */}
                <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-[#222] rounded-lg transition-colors text-gray-400 hover:text-white"><ChevronLeft size={24} /></button>
                
                {/* Tombol Utama Buka Picker */}
                <button 
                    onClick={togglePicker}
                    className="flex flex-col items-center px-6 py-2 rounded-xl hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#333] group"
                >
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">
                        <CalendarIcon size={12} />
                        PERIODE LAPORAN
                    </div>
                    <div className="text-xl font-black text-white flex items-center gap-2">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        {/* PANAH KECIL SUDAH DIHAPUS DARI SINI */}
                    </div>
                </button>

                {/* Tombol Next Bulan */}
                <button onClick={() => changeMonth('next')} className="p-2 hover:bg-[#222] rounded-lg transition-colors text-gray-400 hover:text-white"><ChevronRight size={24} /></button>

                {/* --- POPUP KALENDER TAHUN & BULAN --- */}
                {isPickerOpen && (
                    <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-80 bg-[#111] border border-[#333] rounded-2xl shadow-2xl shadow-black z-100 p-5 animate-in zoom-in-95 duration-200 origin-top">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#222]">
                            <button onClick={() => handlePickerYearChange('prev')} className="p-2 hover:bg-[#222] rounded-full text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft size={20}/>
                            </button>
                            <span className="font-black text-xl text-white tracking-widest">{pickerYear}</span>
                            <button onClick={() => handlePickerYearChange('next')} className="p-2 hover:bg-[#222] rounded-full text-gray-400 hover:text-white transition-colors">
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => {
                                const isSelected = currentDate.getMonth() === i && currentDate.getFullYear() === pickerYear;
                                return (
                                    <button 
                                        key={m}
                                        onClick={() => handleMonthSelect(i)}
                                        className={`
                                            py-3 rounded-xl text-sm font-bold transition-all border
                                            ${isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/50' 
                                                : 'bg-[#1A1A1A] text-gray-400 border-[#222] hover:bg-[#222] hover:text-white hover:border-[#444]'
                                            }
                                        `}
                                    >
                                        {m}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            <button onClick={handleExportCSV} className="w-full md:w-auto px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"><Download size={18} /> Export CSV</button>
        </div>

        {/* Backdrop Transparan */}
        {isPickerOpen && (
            <div className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px]" onClick={() => setIsPickerOpen(false)}></div>
        )}

        {/* STATS & CONTENT (SAMA) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 z-10 relative">
            <div className="bg-[#0F0F0F] border border-[#222] p-6 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start z-10 relative"><div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">PENDAPATAN ({currentDate.toLocaleDateString('id-ID', { month: 'short' })})</p><h3 className="text-3xl font-bold text-white">{formatRupiah(stats.revenue)}</h3></div><div className="p-3 bg-[#1A1A1A] rounded-xl text-green-500"><DollarSign size={24} /></div></div>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-green-500/10 to-transparent"></div>
            </div>
            <div className="bg-[#0F0F0F] border border-[#222] p-6 rounded-2xl relative overflow-hidden"><div className="flex justify-between items-start z-10 relative"><div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">BUTUH APPROVAL</p><h3 className="text-3xl font-bold text-white">{stats.pending}</h3></div><div className="p-3 bg-[#1A1A1A] rounded-xl text-yellow-500"><Bell size={24} /></div></div></div>
            <div className="bg-[#0F0F0F] border border-[#222] p-6 rounded-2xl relative overflow-hidden"><div className="flex justify-between items-start z-10 relative"><div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">MEMBER AKTIF</p><h3 className="text-3xl font-bold text-white">{stats.members}</h3></div><div className="p-3 bg-[#1A1A1A] rounded-xl text-indigo-500"><Users size={24} /></div></div></div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-500 z-10 relative">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><span className="w-2 h-8 bg-yellow-500 rounded-full"></span>Permintaan Approval</h2>
                {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div> : 
                transactions.length === 0 ? (<div className="text-center py-20 border border-dashed border-[#222] rounded-2xl bg-[#0A0A0A]"><CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" /><p className="text-gray-500">Tidak ada transaksi pending bulan ini.</p></div>) : (
                    <div className="grid gap-4">{transactions.map((trx) => (<div key={trx.id} className="bg-[#0F0F0F] border border-[#222] p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6"><div className="flex items-center gap-4 w-full md:w-1/3"><div className="w-12 h-12 rounded-full bg-indigo-900/20 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/20">{trx.profiles?.name?.charAt(0) || '?'}</div><div><h4 className="font-bold text-white text-lg">{trx.profiles?.name}</h4><p className="text-gray-500 text-xs mt-1"><CalendarIcon size={12} className="inline mr-1"/> {new Date(trx.created_at).toLocaleString('id-ID')}</p></div></div><div className="w-full md:w-1/3"><div className="bg-[#151515] px-4 py-2 rounded-lg border border-[#222] inline-block"><p className="font-bold text-white text-sm">{trx.plans?.name}</p><p className="text-xs text-indigo-400 font-bold mt-0.5">{formatRupiah(trx.amount)}</p></div></div><div className="flex items-center gap-3 w-full md:w-auto justify-end"><button onClick={() => setSelectedProof(trx.proof_url)} className="p-3 bg-[#1A1A1A] hover:bg-[#252525] text-gray-300 rounded-xl border border-[#333] transition-colors"><Eye size={20} /></button><button onClick={() => handleReject(trx.id)} disabled={processingId === trx.id} className="px-4 py-2.5 bg-red-900/10 text-red-500 hover:bg-red-900/20 border border-red-900/30 rounded-xl font-bold text-sm flex items-center gap-2">{processingId === trx.id ? <Loader2 className="animate-spin w-4 h-4" /> : <XCircle size={18} />} Tolak</button><button onClick={() => handleApprove(trx.id)} disabled={processingId === trx.id} className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2">{processingId === trx.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle size={18} />} Setujui</button></div></div>))}</div>
                )}
            </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
            <div className="space-y-6 animate-in fade-in duration-500 z-10 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-white flex items-center gap-3"><span className="w-2 h-8 bg-indigo-600 rounded-full"></span>Daftar Member</h2><div className="bg-[#111] p-1 rounded-lg border border-[#222] flex"><button onClick={() => setMemberFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md ${memberFilter === 'all' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Semua</button><button onClick={() => setMemberFilter('active')} className={`px-3 py-1 text-xs font-bold rounded-md ${memberFilter === 'active' ? 'bg-green-900/30 text-green-500' : 'text-gray-500'}`}>Aktif</button><button onClick={() => setMemberFilter('inactive')} className={`px-3 py-1 text-xs font-bold rounded-md ${memberFilter === 'inactive' ? 'bg-red-900/30 text-red-500' : 'text-gray-500'}`}>Non-Aktif</button></div></div>
                    <div className="flex gap-2 w-full md:w-auto"><div className="relative w-full md:w-64"><input type="text" placeholder="Cari nama/email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0F0F0F] border border-[#222] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-gray-300" suppressHydrationWarning={true} /><Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" /></div><button onClick={() => setIsAddingMember(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20"><PlusCircle size={18} /> Tambah</button></div>
                </div>
                <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-400"><thead className="bg-[#151515] text-gray-200 font-bold uppercase text-xs"><tr><th className="p-4">Nama Member</th><th className="p-4">Status</th><th className="p-4">Expired Date</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#222]">{filteredMembers.map((m) => (<tr key={m.id} className="hover:bg-[#1A1A1A] transition-colors"><td className="p-4"><div className="font-bold text-white">{m.name || 'Tanpa Nama'}</div><div className="text-xs">{m.email}</div></td><td className="p-4">{m.is_active ? <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold">AKTIF</span> : <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs font-bold">NON-AKTIF</span>}</td><td className="p-4 font-mono text-white">{formatIndoDate(m.expired_at)}</td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setExtendingMember(m)} className="p-2 bg-[#222] hover:bg-green-600 hover:text-white rounded-lg text-gray-400" title="Perpanjang"><DollarSign size={16} /></button><button onClick={() => setEditingMember(m)} className="p-2 bg-[#222] hover:bg-indigo-600 hover:text-white rounded-lg text-gray-400" title="Edit Profil"><Edit size={16} /></button><button onClick={() => handleDeleteMember(m.id)} className="p-2 bg-[#222] hover:bg-red-600 hover:text-white rounded-lg text-gray-400" title="Hapus"><Trash2 size={16} /></button></div></td></tr>))}</tbody></table></div></div>
            </div>
        )}
      </main>

      {/* MODALS (SAMA SEPERTI KODE SEBELUMNYA) */}
      {isAddingMember && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            {/* ... Isi Modal Tambah Member ... */}
            <div className="bg-[#111] w-full max-w-md rounded-2xl border border-[#333] p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-1">Tambah Member Baru</h3>
                <p className="text-gray-500 text-sm mb-6">Buat akun member secara manual</p>
                <form action={handleCreateMember} className="space-y-4">
                    <div><input name="name" required placeholder="Nama Lengkap" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div><input name="email" required type="email" placeholder="Email" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div><input name="password" required type="text" defaultValue="12345678" placeholder="Password Default" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div><input name="phone" type="text" placeholder="No HP" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Pilih Paket</label><select name="planId" onChange={handleSelectPlanCreate} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"><option value="">- Pilih Paket -</option>{availablePlans.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Bayar (Rp)</label><input name="amount" type="number" value={createAmount} onChange={e => setCreateAmount(Number(e.target.value))} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500" /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Durasi Manual (Hari)</label><input name="initialDays" type="number" min="0" placeholder="0 (jika tdk pilih paket)" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Tanggal Transaksi</label><input name="joinDate" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsAddingMember(false)} className="flex-1 py-3 bg-[#1A1A1A] text-gray-400 rounded-xl font-bold hover:bg-[#222]">Batal</button><button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500">Buat & Bayar</button></div>
                </form>
            </div>
        </div>
      )}
      {editingMember && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            {/* ... Isi Modal Edit Member ... */}
            <div className="bg-[#111] w-full max-w-md rounded-2xl border border-[#333] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">Edit Data / Perpanjang</h3>
                <form action={handleUpdateMemberFull} className="space-y-4">
                    <input type="hidden" name="userId" value={editingMember.id} />
                    <div className="space-y-3 pb-4 border-b border-[#333]">
                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Data Diri</p>
                        <div><label className="text-xs text-gray-500">Nama</label><input name="name" defaultValue={editingMember.name} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white" /></div>
                        <div><label className="text-xs text-gray-500">No HP</label><input name="phone" defaultValue={editingMember.phone_number} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white" /></div>
                        <div><label className="text-xs text-gray-500">Tipe Member</label><select name="memberType" defaultValue={editingMember.member_type} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white"><option value="Reguler">Reguler</option><option value="VIP">VIP</option></select></div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-xs text-green-400 font-bold uppercase tracking-wider flex items-center gap-2"><DollarSign size={14}/> Perpanjang / Ganti Paket (Opsional)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Pilih Paket</label><select name="planId" onChange={handleSelectPlanEdit} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"><option value="">- Tidak Ganti -</option>{availablePlans.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
                            <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Bayar (Rp)</label><input name="amount" type="number" value={formAmount} onChange={e => setFormAmount(Number(e.target.value))} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500" /></div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Tanggal Transaksi</label><input name="trxDate" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" /></div>
                    </div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-3 bg-[#222] text-white rounded-xl">Batal</button><button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500">Simpan Perubahan</button></div>
                </form>
            </div>
        </div>
      )}
      {extendingMember && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            {/* ... Isi Modal Extend Manual ... */}
            <div className="bg-[#111] w-full max-w-md rounded-2xl border border-[#333] p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-1">Perpanjang Membership</h3>
                <p className="text-gray-500 text-sm mb-6">Member: <span className="text-indigo-400">{extendingMember.name}</span></p>
                <form onSubmit={handleManualExtend} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase mb-2">Tambah Hari</label><div className="grid grid-cols-3 gap-2 mb-2">{[30, 90, 180].map(d => (<button key={d} type="button" onClick={() => setExtendDays(d)} className={`py-2 rounded-lg text-sm border ${extendDays === d ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1A1A1A] border-[#333] text-gray-400'}`}>{d} Hari</button>))}</div><input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white" placeholder="Input manual..." /></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase mb-2">Bayar (Rp)</label><input type="number" value={manualPrice} onChange={(e) => setManualPrice(Number(e.target.value))} className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white" placeholder="230000" /></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setExtendingMember(null)} className="flex-1 py-3 bg-[#222] text-white rounded-xl">Batal</button><button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500">Bayar & Aktifkan</button></div>
                </form>
            </div>
        </div>
      )}
      {selectedProof && (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
            <div className="relative max-w-3xl w-full h-[80vh] bg-[#111] rounded-2xl overflow-hidden border border-[#333]" onClick={(e) => e.stopPropagation()}>
                 <Image src={selectedProof} alt="Bukti" fill className="object-contain" />
            </div>
        </div>
      )}
    </div>
  )
}