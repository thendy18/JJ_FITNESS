# 🎬 Framer Motion - Panduan Animasi

Project ini sudah dilengkapi dengan **Framer Motion** untuk animasi yang smooth dan modern.

## 📦 Komponen Animasi

File: `src/components/AnimatedSection.tsx`

### 1. **FadeIn** - Fade in dari bawah
```tsx
<FadeIn delay={0.2}>
  <div>Konten kamu</div>
</FadeIn>
```

### 2. **SlideIn** - Slide dari kiri
```tsx
<SlideIn delay={0.3}>
  <h1>Judul</h1>
</SlideIn>
```

### 3. **ScaleIn** - Zoom in dengan spring effect
```tsx
<ScaleIn delay={0.1}>
  <img src="logo.png" />
</ScaleIn>
```

### 4. **ScrollReveal** - Animasi saat scroll (on scroll)
```tsx
<ScrollReveal>
  <div>Muncul saat di-scroll</div>
</ScrollReveal>
```

## 🎯 Contoh Penggunaan

### Login Page
- Logo: `ScaleIn` dengan delay 0.2s
- Title: `FadeIn` dengan delay 0.3s
- Form: `FadeIn` dengan delay 0.4s

### Member Dashboard
- Header: `FadeIn` + `SlideIn`
- Member Card: `ScaleIn` dengan delay 0.3s
- Plan Carousel: `ScrollReveal`
- Transaction History: `ScrollReveal`

### Signup Page
- Title: `SlideIn` dengan delay 0.2s
- Form: `FadeIn` dengan delay 0.4s

## ⚙️ Customisasi

Semua komponen menerima props:
- `delay`: Waktu delay dalam detik (default: 0)
- `className`: Tailwind classes tambahan

## 🚀 Tips

1. Gunakan `delay` untuk membuat animasi berurutan
2. `ScrollReveal` bagus untuk konten panjang
3. `ScaleIn` cocok untuk logo dan gambar
4. `FadeIn` universal untuk hampir semua elemen
5. Jangan terlalu banyak animasi - keep it simple!

## 📚 Dokumentasi Lengkap

https://www.framer.com/motion/

---

# 📊 Dashboard Analytics & Notifications

## Fitur Baru Admin Panel

### 1. Dashboard Analytics
- **Revenue Trend** - Grafik line chart revenue 6 bulan terakhir
- **Member Growth** - Grafik bar chart pertumbuhan member
- **Plan Distribution** - Pie chart distribusi paket membership
- **KPI Cards** - Total revenue, members, avg revenue, member baru

### 2. Expiring Members Notification
- Alert member yang akan expired dalam 30 hari
- Color-coded urgency:
  - **Merah** - Expired atau ≤3 hari
  - **Orange** - 4-7 hari
  - **Kuning** - 8-30 hari
- Tampilkan nama, email, phone, dan countdown

### Libraries Used
- `recharts` - Untuk grafik (line, bar, pie chart)
- `date-fns` - Untuk manipulasi tanggal

### Tab Navigation
1. **Analytics** - Dashboard dengan grafik dan notifikasi
2. **Overview** - Approval transaksi pending
3. **Members** - Manajemen member

---

# 🚀 Quick Actions & Toast Notifications

## Quick Actions di Expiring Members

Member yang akan expired sekarang punya tombol **"Perpanjang"** langsung di card notifikasi:

**Fitur:**
- Tombol hijau "💰 Perpanjang" di setiap card member
- Klik → Modal perpanjang langsung muncul
- Hemat waktu, gak perlu ke tab Members

**Workflow:**
1. Lihat notifikasi member mau expired
2. Klik tombol "Perpanjang"
3. Isi durasi & harga
4. Submit → Done!

## Toast Notifications

Semua feedback sekarang pakai **toast notification** (bukan alert/confirm):

**Library:** `sonner` - Modern toast notification untuk React

**Fitur:**
- ✅ Success toast (hijau)
- ❌ Error toast (merah)
- ⏳ Loading toast (biru)
- Auto-dismiss setelah 3-4 detik
- Bisa stack multiple notifications
- Gak blocking workflow

**Contoh:**
- Approve transaksi → "✅ Transaksi disetujui!"
- Reject transaksi → "❌ Transaksi ditolak"
- Hapus member → "🗑️ Member berhasil dihapus"
- Perpanjang membership → "💰 Membership berhasil diperpanjang!"
- Export CSV → "Laporan berhasil diunduh!"

**Posisi:** Top-right corner dengan close button
