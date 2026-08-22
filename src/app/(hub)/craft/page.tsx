import { assets } from '@/lib/repo'
import CraftLibrary from './CraftLibrary'

/**
 * 读数据库的页面必须每次请求现算。
 * Next 默认会把它静态预渲染，把「构建那一刻的库内容」烤进 HTML——
 * 新建的书不出现、删掉的还在，用起来像坏了。
 */
export const dynamic = 'force-dynamic'

export default function CraftPage() {
  return <CraftLibrary cards={assets.craft()} />
}
