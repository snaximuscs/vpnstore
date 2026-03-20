import SignUpBlock from "@/components/ui/sign-up-block";
import Link from "next/link";

export const metadata = {
  title: "Бүртгүүлэх — 1stCS VPN",
  description: "Create your 1stCS VPN account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              V
            </div>
            <span className="font-semibold text-sm text-foreground">1stCS VPN</span>
          </Link>
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </nav>

      {/* Centered form */}
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <SignUpBlock />
        </div>
      </main>
    </div>
  );
}
