'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, Users, DollarSign, Bell, LogOut, CheckCircle, XCircle, Eye, Calendar, Search, Edit, Trash2, PlusCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { createMember, deleteMember, updateMemberFull } from './actions'
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

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num)

const formatIndoDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (date.getFullYear() < 2000) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [stats, setStats] = useState({ pending: 0, members: 0, revenue: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)

  // Modal States
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  // State Form Dinamis
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [formAmount, setFormAmount] = useState(0)
  const [createAmount, setCreateAmount] = useState(0)

  // --- FETCH DATA ---
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

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
      setTransactions(trxData.filter(t => t.status === 'PENDING') as Transaction[])
      const approvedTrx = trxData.filter(t => t.status === 'APPROVED')
      const monthlyRevenue = approvedTrx.reduce((sum, t) => sum + t.amount, 0)

      const { count: memberCount } = await supabase
        .schema('members')
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      setStats({
        pending: trxData.filter(t => t.status === 'PENDING').length,
        members: memberCount || 0,
        revenue: monthlyRevenue
      })
    }

    // 2. Members
    const { data: memberData } = await supabase
      .schema('members')
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (memberData) setMembers(memberData as Member[])

    // 3. Plans
    const { data: plansData } = await supabase
      .schema('members')
      .from('plans')
      .select('*')
      .eq('is_active', true)
    if (plansData) setAvailablePlans(plansData)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [currentDate])

  // Handler pilih paket
  const handleSelectPlanEdit = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedPlanId(id)
    const plan = availablePlans.find(p => p.id === id)
    if (plan) setFormAmount(plan.price)
    else setFormAmount(0)
  }

  const handleSelectPlanCreate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const plan = availablePlans.find(p => p.id === id)
    if (plan) setCreateAmount(plan.price)
    else setCreateAmount(0)
  }

  // Reset form
  useEffect(() => {
    if (!isAddingMember && !editingMember) {
      setSelectedPlanId('')
      setFormAmount(0)
      setCreateAmount(0)
    }
  }, [isAddingMember, editingMember])

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
    setLoading(true)
  }

  const handleExportCSV = async () => {
    if (!confirm('Download laporan bulan ini?')) return

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: reportData } = await supabase
      .schema('members')
      .from('transactions')
      .select(`created_at, amount, status, proof_url, profiles(name, email, expired_at), plans(name)`)
      .eq('status', 'APPROVED')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
      .order('created_at', { ascending: true })

    if (!reportData || reportData.length === 0) {
      alert('Tidak ada data transaksi sukses.')
      return
    }

    const csvData = reportData.map((trx: any) => {
      let paketName = trx.plans?.name || '-'
      if (trx.proof_url?.includes('MANUAL')) paketName = 'Manual (Cash)'
      else if (!trx.plans?.name) paketName = 'Paket Terhapus'

      return {
        'Tanggal Bayar': new Date(trx.created_at).toLocaleDateString('id-ID'),
        'Nama Member': trx.profiles?.name || 'Tanpa Nama',
        Email: trx.profiles?.email || '-',
        Paket: paketName,
        'Nominal (Rp)': trx.amount,
        'Expired Date': trx.profiles?.expired_at
          ? new Date(trx.profiles.expired_at).toLocaleDateString('id-ID')
          : '-',
        Status: 'LUNAS'
      }
    })

    const totalPendapatan = reportData.reduce((sum, t) => sum + t.amount, 0)
    csvData.push({
      'Tanggal Bayar': '',
      'Nama Member': '',
      Email: '',
      Paket: 'TOTAL PENDAPATAN',
      'Nominal (Rp)': totalPendapatan,
      'Expired Date': '',
      Status: ''
    } as any)

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `Laporan_${currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- ACTIONS ---
  const handleApprove = async (trxId: string) => {
    if (!confirm('Setujui?')) return
    setProcessingId(trxId)
    try {
      await supabase.rpc('approve_payment', { target_transaction_id: trxId })
      alert('Berhasil!')
      fetchData()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (trxId: string) => {
    if (!confirm('Tolak?')) return
    setProcessingId(trxId)
    try {
      await supabase
        .schema('members')
        .from('transactions')
        .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
        .eq('id', trxId)
      fetchData()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Hapus permanen?')) return
    const result = await deleteMember(id)
    if (result?.error) alert('Gagal hapus: ' + result.error)
    else {
      alert('Dihapus.')
      fetchData()
    }
  }

  const handleUpdateMemberFull = async (formData: FormData) => {
    // Hapus plan_id jika kosong atau "null" untuk mencegah error UUID
    const planId = formData.get('plan_id')
    if (!planId || planId === '' || planId === 'null') {
      formData.delete('plan_id')
    }
    
    // Hapus amount jika 0 atau kosong (tidak ada perpanjangan)
    const amount = formData.get('amount')
    if (!amount || amount === '0') {
      formData.delete('amount')
      formData.delete('plan_id') // Jika tidak bayar, jangan kirim plan_id
    }
    
    const result = await updateMemberFull(formData)
    if (result?.error) alert('Gagal update: ' + result.error)
    else {
      alert('Data member berhasil diupdate & transaksi dicatat!')
      setEditingMember(null)
      fetchData()
    }
  }

  const handleCreateMember = async (formData: FormData) => {
    const result = await createMember(formData)
    if (result?.error) alert('Gagal: ' + result.error)
    else {
      alert('Sukses!')
      setIsAddingMember(false)
      fetchData()
    }
  }

  const filteredMembers = members.filter(
    m =>
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* NAVBAR */}
      <nav className="bg-[#0F0F0F] border-b border-[#1A1A1A] sticky top-0 z-50 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  ADMIN PANEL
                </h1>
                <p className="text-xs text-gray-500">Gym Master Control</p>
              </div>
            </div>

            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#222] text-white shadow'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                  activeTab === 'members'
                    ? 'bg-[#222] text-white shadow'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Manajemen Member
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-[#222] rounded-lg transition-colors text-gray-400"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Tab */}
        <div className="md:hidden flex border-t border-[#1A1A1A]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-sm font-bold ${
              activeTab === 'overview'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-500'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-sm font-bold ${
              activeTab === 'members'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-500'
            }`}
          >
            Members
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Export */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeMonth('prev')}
              className="p-2 hover:bg-[#222] rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">PERIODE</p>
              <h2 className="text-lg font-bold">
                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <button
              onClick={() => changeMonth('next')}
              className="p-2 hover:bg-[#222] rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/20 to-green-600/5 border border-green-900/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign size={24} className="text-green-400" />
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wide">PENDAPATAN</p>
            </div>
            <p className="text-3xl font-black text-green-400">{formatRupiah(stats.revenue)}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-600/5 border border-yellow-900/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Bell size={24} className="text-yellow-400" />
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wide">BUTUH APPROVAL</p>
            </div>
            <p className="text-3xl font-black text-yellow-400">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/20 to-indigo-600/5 border border-indigo-900/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Users size={24} className="text-indigo-400" />
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wide">MEMBER AKTIF</p>
            </div>
            <p className="text-3xl font-black text-indigo-400">{stats.members}</p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="bg-[#0F0F0F] rounded-2xl border border-[#1A1A1A] p-6">
            <h3 className="text-xl font-bold mb-6">Permintaan Approval</h3>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell size={48} className="mx-auto mb-4 opacity-30" />
                <p>Tidak ada transaksi pending bulan ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map(trx => (
                  <div
                    key={trx.id}
                    className="bg-[#1A1A1A] border border-[#222] rounded-xl p-4 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                          {trx.profiles?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-lg">{trx.profiles?.name}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(trx.created_at).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {trx.plans?.name} • {formatRupiah(trx.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProof(trx.proof_url)}
                          className="p-3 bg-[#1A1A1A] hover:bg-[#252525] text-gray-300 rounded-xl border border-[#333] transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(trx.id)}
                          disabled={processingId === trx.id}
                          className="px-4 py-2.5 bg-red-900/10 text-red-500 hover:bg-red-900/20 border border-red-900/30 rounded-xl font-bold text-sm flex items-center gap-2"
                        >
                          {processingId === trx.id ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                          Tolak
                        </button>
                        <button
                          onClick={() => handleApprove(trx.id)}
                          disabled={processingId === trx.id}
                          className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                        >
                          {processingId === trx.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                          Setujui
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <div className="bg-[#0F0F0F] rounded-2xl border border-[#1A1A1A] p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold">Daftar Member</h3>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Cari nama/email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#222] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-gray-300"
                    suppressHydrationWarning={true}
                  />
                </div>
                <button
                  onClick={() => setIsAddingMember(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <PlusCircle size={18} />
                  Tambah
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-400">Nama Member</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-400">Expired Date</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-400">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold">{m.name || 'Tanpa Nama'}</p>
                        <p className="text-sm text-gray-500">{m.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        {m.is_active ? (
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                            AKTIF
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-bold border border-red-500/30">
                            NON-AKTIF
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">{formatIndoDate(m.expired_at)}</td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="p-2 bg-[#222] hover:bg-blue-600 hover:text-white rounded-lg text-gray-400"
                            title="Edit & Perpanjang"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-2 bg-[#222] hover:bg-red-600 hover:text-white rounded-lg text-gray-400"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: TAMBAH MEMBER */}
        {isAddingMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0F0F0F] rounded-2xl border border-[#1A1A1A] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#1A1A1A]">
                <h3 className="text-xl font-bold">Tambah Member Baru</h3>
                <p className="text-sm text-gray-500">Buat akun member secara manual</p>
              </div>

              <form action={handleCreateMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Password (Default)</label>
                  <input
                    type="password"
                    name="password"
                    defaultValue="password123"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">No HP (Opsional)</label>
                  <input
                    type="text"
                    name="phone_number"
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Pilih Paket</label>
                  <select
                    name="plan_id"
                    onChange={handleSelectPlanCreate}
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  >
                    <option value="">- Pilih Paket -</option>
                    {availablePlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Bayar (Rp)</label>
                  <input
                    type="number"
                    name="amount"
                    value={createAmount}
                    onChange={e => setCreateAmount(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Durasi Manual (Hari)</label>
                  <input
                    type="number"
                    name="duration_days"
                    placeholder="Opsional jika paket dipilih"
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">*Jika pilih paket, durasi otomatis ikut paket. Jika kosong, isi ini.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Tanggal Transaksi</label>
                  <input
                    type="date"
                    name="transaction_date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="flex-1 py-3 bg-[#1A1A1A] text-gray-400 rounded-xl font-bold hover:bg-[#222]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg"
                  >
                    Buat & Bayar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT MEMBER */}
        {editingMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0F0F0F] rounded-2xl border border-[#1A1A1A] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#1A1A1A]">
                <h3 className="text-xl font-bold">Edit Data / Perpanjang</h3>
                <p className="text-sm text-gray-500">{editingMember.name}</p>
              </div>

              <form action={handleUpdateMemberFull} className="p-6 space-y-6">
                <input type="hidden" name="member_id" value={editingMember.id} />

                <div>
                  <h4 className="font-bold mb-3">Data Diri</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold mb-2">Nama</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingMember.name}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">No HP</label>
                      <input
                        type="text"
                        name="phone_number"
                        defaultValue={editingMember.phone_number || ''}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-3">Perpanjang / Ganti Paket (Opsional)</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold mb-2">Pilih Paket</label>
                      <select
                        value={selectedPlanId}
                        onChange={handleSelectPlanEdit}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                      >
                        <option value="">- Tidak Ganti -</option>
                        {availablePlans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {selectedPlanId && <input type="hidden" name="plan_id" value={selectedPlanId} />}
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Bayar (Rp)</label>
                      <input
                        type="number"
                        name="amount"
                        value={formAmount}
                        onChange={e => setFormAmount(Number(e.target.value))}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Tanggal Transaksi</label>
                      <input
                        type="date"
                        name="transaction_date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl p-3 text-white focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 py-3 bg-[#222] text-white rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PROOF */}
        {selectedProof && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProof(null)}
          >
            <div
              className="relative max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedProof(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 font-bold text-xl"
              >
                ✕ Tutup
              </button>
              <Image
                src={selectedProof}
                alt="Bukti Transfer"
                width={1000}
                height={1000}
                className="rounded-xl w-full h-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}