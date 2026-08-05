import { getSetting } from '@/lib/db'
import { OPERATORS, VENUES } from '@/lib/platform'
import PlatformDesk from './PlatformDesk'

type Verified = Record<string, { v: string; d: string }>

export default function PlatformsPage() {
  const load = (k: string): Verified => {
    try {
      return JSON.parse(getSetting(`platform.verified.${k}`, '{}')) as Verified
    } catch {
      return {}
    }
  }
  // 运营商层与阵地层各自有自己的核实记录
  const keys = [...Object.keys(OPERATORS), ...VENUES.map((v) => v.id)]
  return <PlatformDesk verified={Object.fromEntries(keys.map((k) => [k, load(k)]))} />
}
