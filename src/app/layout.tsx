import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '榫 · AI 小说创作系统',
  description: '从规则推演到日更流水线的全环节创作工作台',
}

// 首屏前套用主题，避免闪白
const themeInit = `(function(){try{var t=localStorage.getItem('tenon.theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
