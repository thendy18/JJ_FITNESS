'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react'

type AnalyticsData = {
  monthlyRevenue: { month: string; revenue: number }[]
  memberGrowth: { month: string; new: number; total: number }[]
  stats: {
    totalRevenue: number
    revenueGrowth: number
    totalMembers: number
    memberGrowth: number
    avgRevenue: number
  }
}

export default function DashboardAnalytics({ data }: { data: AnalyticsData }) {
  const formatRupiah = (num: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase">Total Revenue</p>
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{formatRupiah(data.stats.totalRevenue)}</h3>
          <div className={`flex items-center gap-1 text-[10px] md:text-xs ${data.stats.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {data.stats.revenueGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(data.stats.revenueGrowth).toFixed(1)}% vs bulan lalu</span>
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase">Total Members</p>
            <Users className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{data.stats.totalMembers}</h3>
          <div className={`flex items-center gap-1 text-[10px] md:text-xs ${data.stats.memberGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {data.stats.memberGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(data.stats.memberGrowth).toFixed(1)}% vs bulan lalu</span>
          </div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase">Avg Revenue/Member</p>
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">{formatRupiah(data.stats.avgRevenue)}</h3>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase">Member Baru</p>
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">
            {data.memberGrowth[data.memberGrowth.length - 1]?.new || 0}
          </h3>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Chart */}
        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-6 rounded-2xl">
          <h3 className="text-base md:text-lg font-bold text-white mb-4">Revenue Trend (6 Bulan)</h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#666" style={{ fontSize: '10px' }} />
                <YAxis stroke="#666" style={{ fontSize: '10px' }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatRupiah(value), 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Growth Chart */}
        <div className="bg-[#0F0F0F] border border-[#222] p-4 md:p-6 rounded-2xl">
          <h3 className="text-base md:text-lg font-bold text-white mb-4">Member Growth (6 Bulan)</h3>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <BarChart data={data.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#666" style={{ fontSize: '10px' }} />
                <YAxis stroke="#666" style={{ fontSize: '10px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="new" fill="#10b981" name="Member Baru" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  )
}
