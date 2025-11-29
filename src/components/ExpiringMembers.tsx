'use client'

import { AlertTriangle, Clock, Mail, Phone, DollarSign } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { id } from 'date-fns/locale'

type ExpiringMember = {
  id: string
  name: string
  email: string
  phone_number: string
  expired_at: string
  daysLeft: number
}

type ExpiringMembersProps = {
  members: ExpiringMember[]
  onExtend: (member: ExpiringMember) => void
}

export default function ExpiringMembers({ members, onExtend }: ExpiringMembersProps) {
  
  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'border-red-500 bg-red-900/10'
    if (days <= 3) return 'border-orange-500 bg-orange-900/10'
    return 'border-yellow-500 bg-yellow-900/10'
  }

  const getUrgencyBadge = (days: number) => {
    if (days <= 0) return <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">EXPIRED</span>
    if (days <= 1) return <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">URGENT</span>
    if (days <= 3) return <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold">SEGERA</span>
    return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">PERHATIAN</span>
  }

  if (members.length === 0) {
    return (
      <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-8 text-center">
        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500">Tidak ada member yang akan expired dalam 5 hari ke depan</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <div>
          <h3 className="text-lg font-bold text-white">⚠️ Member Akan Expired</h3>
          <p className="text-gray-500 text-sm">{members.length} member perlu perpanjangan segera (≤5 hari)</p>
        </div>
      </div>

      <div className="grid gap-3">
        {members.map((member) => (
          <div 
            key={member.id} 
            className={`border-l-4 p-4 rounded-xl bg-[#0F0F0F] border-r border-t border-b border-[#222] ${getUrgencyColor(member.daysLeft)}`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-white">{member.name}</h4>
                  {getUrgencyBadge(member.daysLeft)}
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail size={12} />
                    <span>{member.email}</span>
                  </div>
                  {member.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} />
                      <span>{member.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Expired Date</div>
                  <div className="font-mono text-white font-bold">
                    {format(new Date(member.expired_at), 'dd MMM yyyy', { locale: id })}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${
                    member.daysLeft <= 0 ? 'text-red-400' : 
                    member.daysLeft <= 1 ? 'text-red-400' : 
                    member.daysLeft <= 3 ? 'text-orange-400' : 'text-yellow-400'
                  }`}>
                    {member.daysLeft <= 0 ? 'Sudah Expired' : `${member.daysLeft} hari lagi`}
                  </div>
                </div>

                {/* Quick Action Button */}
                <button
                  onClick={() => onExtend(member)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
                  title="Perpanjang Membership"
                >
                  <DollarSign size={16} />
                  <span className="hidden md:inline">Perpanjang</span>
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
