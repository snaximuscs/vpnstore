// Server component (no 'use client')
// Next.js 16: searchParams is a Promise — must be awaited
import { AuthUI } from '@/components/ui/auth-fuse'

interface Props {
  searchParams: Promise<{ next?: string; plan?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, plan } = await searchParams
  const redirectTo = plan
    ? `${next || '/dashboard'}?plan=${plan}`
    : (next || '/dashboard')

  return <AuthUI defaultIsSignIn={true} redirectTo={redirectTo} />
}
