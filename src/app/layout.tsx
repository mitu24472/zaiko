import './globals.css'
import React from 'react'

export const metadata = {
  title: '創作展 物品貸出管理システム',
  description: '創作展における物品貸出管理システム',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className="font-sans bg-gray-900 text-gray-100 antialiased">{children}</body>
    </html>
  )
}
