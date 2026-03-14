import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function GCPPCheckPage() {
  redirect('/gcpp-check/market-overview')
}
