// src/app/layout.tsx
import type { Metadata } from "next";
// 1. Import font Inter dari google
import { Inter } from "next/font/google"; 
import "./globals.css";

// 2. Konfigurasi font (subsets: latin wajib biar support bahasa inggris/indonesia)
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gym Master",
  description: "Aplikasi Manajemen Gym",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 3. Terapkan class Inter ke tag BODY */}
      {/* Dengan begini, SELURUH aplikasi kamu otomatis pakai font Inter */}
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}