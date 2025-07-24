import './globals.css'
import React from 'react'

export const metadata = {
  title: '小石川創作展 物品貸出管理システム',
  description: '小石川中等教育学校の創作展における物品貸出管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="font-sans">{children}</body>
    </html>
  )
}
