import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，必须留在 node 侧不被打包
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    // AI 生成整章可能跑很久，放宽 server action 的 body/时长限制
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
