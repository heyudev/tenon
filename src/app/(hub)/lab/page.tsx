import { assets } from '@/lib/repo'
import LabDesk from './LabDesk'

export default function LabPage() {
  return <LabDesk labs={assets.labs()} resources={assets.resources()} />
}
