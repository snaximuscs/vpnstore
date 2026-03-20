// Server component (no 'use client')
// Next.js 16: searchParams is a Promise — must be awaited
import { AuthUI } from '@/components/ui/auth-fuse'

interface Props {
  searchParams: Promise<{ plan?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { plan } = await searchParams
  const redirectTo = plan ? `/dashboard?plan=${plan}` : '/dashboard'

  return <AuthUI defaultIsSignIn={false} redirectTo={redirectTo} />
}
