import { assets, projects } from '@/lib/repo'
import RuleBrowser from './RuleBrowser'

export default function RulebasePage() {
  return <RuleBrowser rules={assets.rules()} domains={assets.domains()} books={projects.all()} />
}
