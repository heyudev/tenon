import { assets } from '@/lib/repo'
import CraftLibrary from './CraftLibrary'

export default function CraftPage() {
  return <CraftLibrary cards={assets.craft()} />
}
