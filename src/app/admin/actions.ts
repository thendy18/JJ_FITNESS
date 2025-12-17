'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("Konfigurasi server error: Service Role Key missing")
  }

  return createClient(url!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// --- 1. CREATE MEMBER ---
export async function createMember(formData: FormData) {
  const supabase = getAdminClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const phone = formData.get('phone_number') as string

  // Ambil Data Paket & Pembayaran
  const durationDays = parseInt(formData.get('duration_days') as string) || 0
  const amountPaid = parseInt(formData.get('amount') as string) || 0
  const transactionDate = formData.get('transaction_date') as string || new Date().toISOString()
  const planIdRaw = formData.get('plan_id') as string
  const planId = planIdRaw && planIdRaw !== '' && planIdRaw !== 'null' ? planIdRaw : null

  console.log("Creating member with:", { name, email, durationDays, amountPaid, planId })

  // 1. Buat User di Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name, phone_number: phone, role: 'USER' }
  })

  if (authError) {
    console.error("Auth Error:", authError)
    return { error: authError.message }
  }

  // 2. JIKA ADMIN MEMILIH PAKET AWAL
  if (authData.user && (durationDays > 0 || planId)) {
    let daysToAdd = durationDays

    // Jika planId ada, ambil durasi dari plan
    if (planId) {
      const { data: plan } = await supabase
        .schema('members')
        .from('plans')
        .select('duration_days')
        .eq('id', planId)
        .single()
      if (plan) daysToAdd = plan.duration_days
    }

    const baseDate = new Date(transactionDate)
    const newExpired = new Date(baseDate)
    newExpired.setDate(newExpired.getDate() + daysToAdd)

    // Update Profil Member
    const { error: profileError } = await supabase
      .schema('members')
      .from('profiles')
      .update({
        is_active: true,
        created_at: transactionDate,
        expired_at: newExpired.toISOString(),
        member_type: 'Reguler',
        phone_number: phone
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error("Gagal update profil:", profileError)
      return { error: 'Gagal update profil: ' + profileError.message }
    }

    // Catat Transaksi jika ada pembayaran
    if (amountPaid > 0) {
      let targetPlanId = planId

      // Jika tidak ada planId, ambil plan pertama sebagai fallback
      if (!targetPlanId) {
        const { data: plan } = await supabase
          .schema('members')
          .from('plans')
          .select('id')
          .limit(1)
          .single()
        targetPlanId = plan?.id
      }

      if (targetPlanId) {
        const { error: trxError } = await supabase
          .schema('members')
          .from('transactions')
          .insert({
            user_id: authData.user.id,
            plan_id: targetPlanId,
            amount: amountPaid,
            status: 'APPROVED',
            proof_url: 'MANUAL_REGISTRATION_ADMIN',
            created_at: transactionDate
          })
        if (trxError) {
          console.error("Gagal insert transaksi:", trxError)
          return { error: 'Gagal insert transaksi: ' + trxError.message }
        }
        console.log("Transaksi berhasil dicatat")
      }
    }
  }


  return { success: true }
}

// --- 2. UPDATE MEMBER FULL (DENGAN EXPIRED DATE) ---
export async function updateMemberFull(formData: FormData) {
  const supabase = getAdminClient()

  const userId = formData.get('userId') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const memberType = formData.get('memberType') as string
  const isActive = formData.get('isActive') === 'true'

  // 🔥 AMBIL EXPIRED DATE BARU DARI FORM
  const expiredDateRaw = formData.get('expired_date') as string
  const expiredDate = expiredDateRaw ? expiredDateRaw : null

  // FIX: Cek apakah planId kosong/null
  const planIdRaw = formData.get('plan_id') as string
  const planId = planIdRaw && planIdRaw !== '' && planIdRaw !== 'null' ? planIdRaw : null

  const amountPaid = parseInt(formData.get('amount') as string) || 0
  const manualDays = parseInt(formData.get('manual_days') as string) || 0
  const trxDate = formData.get('trxDate') as string || new Date().toISOString()

  console.log("Updating member:", {
    userId,
    name,
    phone,
    memberType,
    isActive,
    expiredDate: expiredDate ? new Date(expiredDate).toISOString() : 'not provided',
    planId,
    amountPaid,
    manualDays
  })

  // 🔥 1. PREPARE UPDATE DATA
  const updateData: any = {
    name: name,
    phone_number: phone,
    member_type: memberType,
    updated_at: new Date().toISOString()
  }

  // 🔥 2. HANDLE EXPIRED DATE UPDATE (PRIORITAS UTAMA)
  if (expiredDate) {
    const newExpiredDate = new Date(expiredDate)
    const isExpired = newExpiredDate < new Date()

    updateData.expired_at = newExpiredDate.toISOString()
    updateData.is_active = !isExpired

    console.log(`✅ Setting expired date to: ${newExpiredDate.toISOString()}`)
    console.log(`✅ Member will be: ${isExpired ? 'NON-AKTIF' : 'AKTIF'}`)
  } else {
    // Jika tidak ada expired date baru, pakai status dari form
    updateData.is_active = isActive
  }

  // 🔥 3. UPDATE PROFILE
  const { error: updateError } = await supabase
    .schema('members')
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (updateError) {
    console.error("Update error:", updateError)
    return { error: 'Gagal update profil: ' + updateError.message }
  }

  console.log("✅ Profile updated successfully")

  // 🔥 4. HANDLE PERPANJANGAN OTOMATIS (JIKA TIDAK ADA EXPIRED DATE BARU)
  if (!expiredDate && (planId || manualDays > 0)) {
    const { data: profile } = await supabase
      .schema('members')
      .from('profiles')
      .select('expired_at')
      .eq('id', userId)
      .single()

    if (profile) {
      // Hitung base date untuk perpanjangan
      const currentExp = new Date(profile.expired_at).getTime() < new Date(trxDate).getTime()
        ? new Date(trxDate)
        : new Date(profile.expired_at)

      let durationToAdd = 0

      // Prioritas 1: Manual Days
      if (manualDays > 0) {
        durationToAdd = manualDays
        console.log(`➕ Adding ${manualDays} manual days`)
      }
      // Prioritas 2: Plan Duration
      else if (planId) {
        const { data: plan } = await supabase
          .schema('members')
          .from('plans')
          .select('duration_days')
          .eq('id', planId)
          .single()
        if (plan) {
          durationToAdd = plan.duration_days
          console.log(`➕ Adding ${plan.duration_days} days from plan`)
        }
      }

      // Update expired date jika ada durasi (positif atau negatif)
      if (durationToAdd !== 0) {
        currentExp.setDate(currentExp.getDate() + durationToAdd)

        // Tentukan status aktif berdasarkan tanggal baru
        const isStillActive = currentExp > new Date()

        console.log(`📅 New expired date: ${currentExp.toISOString()}`)
        console.log(`🔔 Status after extension: ${isStillActive ? 'AKTIF' : 'NON-AKTIF'}`)

        await supabase
          .schema('members')
          .from('profiles')
          .update({
            is_active: isStillActive,
            expired_at: currentExp.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }
    }
  }

  // 🔥 5. CATAT TRANSAKSI (JIKA ADA PEMBAYARAN) - TERPISAH DARI LOGIKA EXPIRED
  if (amountPaid > 0) {
    let targetPlanId = planId

    // Pastikan ada plan_id (fallback ke plan pertama jika null)
    if (!targetPlanId) {
      const { data: p } = await supabase.schema('members').from('plans').select('id').limit(1).single()
      if (p) {
        targetPlanId = p.id
        console.log(`💳 Using fallback plan for payment recording`)
      }
    }

    if (targetPlanId) {
      const { error: trxError } = await supabase
        .schema('members')
        .from('transactions')
        .insert({
          user_id: userId,
          plan_id: targetPlanId,
          amount: amountPaid,
          status: 'APPROVED',
          proof_url: 'MANUAL_EDIT_ADMIN',
          created_at: trxDate,
          updated_at: new Date().toISOString()
        })

      if (trxError) {
        console.error("Transaction error:", trxError)
        return { error: 'Gagal insert transaksi: ' + trxError.message }
      }
      console.log("💰 Transaction recorded successfully")
    }
  }

  // 🔥 6. REVALIDATE PATH UNTUK REFRESH CLIENT
  revalidatePath('/admin')

  return {
    success: true,
    message: 'Member berhasil diupdate',
    expiredDate: expiredDate ? new Date(expiredDate).toISOString() : null
  }
}

// --- 3. DELETE MEMBER ---
export async function deleteMember(userId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// --- 4. EXTEND MEMBER MANUAL ---
export async function extendMemberManual(
  userId: string,
  daysToAdd: number,
  amountPaid: number
) {
  const supabase = getAdminClient()

  const { data: profile } = await supabase
    .schema('members')
    .from('profiles')
    .select('expired_at')
    .eq('id', userId)
    .single()

  if (!profile) return { error: 'Member tidak ditemukan' }

  const currentExp = new Date(profile.expired_at).getTime() < Date.now()
    ? new Date()
    : new Date(profile.expired_at)

  currentExp.setDate(currentExp.getDate() + daysToAdd)

  const { error: updateError } = await supabase
    .schema('members')
    .from('profiles')
    .update({
      expired_at: currentExp.toISOString(),
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (updateError) return { error: 'Gagal update profil: ' + updateError.message }

  const { data: plan } = await supabase
    .schema('members')
    .from('plans')
    .select('id')
    .limit(1)
    .single()

  if (plan) {
    await supabase
      .schema('members')
      .from('transactions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        amount: amountPaid,
        status: 'APPROVED',
        proof_url: 'MANUAL_CASH_ADMIN',
        created_at: new Date().toISOString()
      })
  }

  revalidatePath('/admin')
  return { success: true }
}

// --- 5. AUTO UPDATE EXPIRED MEMBERS (PERBAIKAN) ---
export async function updateExpiredMembers() {
  const supabase = getAdminClient()
  const today = new Date().toISOString()

  try {
    console.log('🔄 Checking for expired members...')

    // 1. Ambil semua member yang statusnya aktif tapi expired_at sudah lewat
    const { data: expiredMembers, error: fetchError } = await supabase
      .schema('members')
      .from('profiles')
      .select('id, name, email, expired_at, is_active')
      .eq('is_active', true)
      .lt('expired_at', today)

    if (fetchError) {
      console.error('❌ Error fetching expired members:', fetchError)
      return { error: fetchError.message, count: 0 }
    }

    if (!expiredMembers || expiredMembers.length === 0) {
      console.log('✅ No expired members found')
      return { success: true, count: 0 }
    }

    console.log(`🕒 Found ${expiredMembers.length} expired members:`,
      expiredMembers.map(m => ({ name: m.name, expired: m.expired_at })))

    const expiredIds = expiredMembers.map(m => m.id)

    // 2. Update status menjadi non-aktif
    const { error: updateError, count } = await supabase
      .schema('members')
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .in('id', expiredIds)

    if (updateError) {
      console.error('❌ Error updating expired members:', updateError)
      return { error: updateError.message, count: 0 }
    }

    console.log(`✅ Successfully updated ${expiredIds.length} members to inactive`)

    // Revalidate path untuk refresh data di client
    revalidatePath('/admin')

    return {
      success: true,
      count: expiredIds.length,
      updatedMembers: expiredMembers
    }
  } catch (error) {
    console.error('❌ Unexpected error in updateExpiredMembers:', error)
    return { error: 'Unexpected error', count: 0 }
  }
}