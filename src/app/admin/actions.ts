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

  revalidatePath('/admin')
  return { success: true }
}

// --- 2. UPDATE MEMBER FULL (FIXED) ---
export async function updateMemberFull(formData: FormData) {
  const supabase = getAdminClient()

  const userId = formData.get('userId') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone_number') as string
  
  // FIX: Cek apakah planId kosong/null
  const planIdRaw = formData.get('plan_id') as string
  const planId = planIdRaw && planIdRaw !== '' && planIdRaw !== 'null' ? planIdRaw : null
  
  const amountPaid = parseInt(formData.get('amount') as string) || 0
  const trxDate = formData.get('transaction_date') as string || new Date().toISOString()

  console.log("Updating member:", { userId, name, phone, planId, amountPaid })

  // 1. Update profil dasar (nama & no HP)
  const { error: updateError } = await supabase
    .schema('members')
    .from('profiles')
    .update({
        name: name,
        phone_number: phone
    })
    .eq('id', userId)

  if (updateError) {
    console.error("Update error:", updateError)
    return { error: 'Gagal update profil: ' + updateError.message }
  }

  // 2. Jika ada perpanjangan/pembayaran
  if ((planId || amountPaid > 0)) {
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
          let targetPlanId = planId

          // Jika ada planId, ambil durasi
          if (planId) {
             const { data: plan } = await supabase
               .schema('members')
               .from('plans')
               .select('duration_days')
               .eq('id', planId)
               .single()
             if (plan) durationToAdd = plan.duration_days
          } else if (amountPaid > 0) {
             // Jika cuma bayar tanpa pilih paket, ambil plan pertama sebagai fallback
             const { data: p } = await supabase
               .schema('members')
               .from('plans')
               .select('id, duration_days')
               .limit(1)
               .single()
             if (p) {
               targetPlanId = p.id
               durationToAdd = p.duration_days
             }
          }

          // Update expired date jika ada durasi
          if (durationToAdd > 0) {
              currentExp.setDate(currentExp.getDate() + durationToAdd)
              await supabase
                .schema('members')
                .from('profiles')
                .update({
                    is_active: true,
                    expired_at: currentExp.toISOString()
                })
                .eq('id', userId)
          }

          // Catat transaksi jika ada pembayaran DAN targetPlanId valid
          if (amountPaid > 0 && targetPlanId) {
               const { error: trxError } = await supabase
                 .schema('members')
                 .from('transactions')
                 .insert({
                     user_id: userId,
                     plan_id: targetPlanId,
                     amount: amountPaid,
                     status: 'APPROVED',
                     proof_url: 'MANUAL_EDIT_ADMIN',
                     created_at: trxDate
                 })
               
               if (trxError) {
                 console.error("Transaction error:", trxError)
                 return { error: 'Gagal insert transaksi: ' + trxError.message }
               }
          }
      }
  }

  revalidatePath('/admin')
  return { success: true }
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
            proof_url: 'MANUAL_CASH_ADMIN'
        })
  }

  revalidatePath('/admin')
  return { success: true }
}