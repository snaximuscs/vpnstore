import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-24 px-4">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Decorative shield */}
      <div className="pointer-events-none absolute right-8 top-24 opacity-5 hidden lg:block">
        <Shield size={320} strokeWidth={0.5} className="text-brand-400" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-950/50 px-4 py-1.5 text-sm text-brand-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          WireGuard · QPay · Автомат тохиргоо
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Хурдан, найдвартай
          <br />
          <span className="text-brand-400">VPN үйлчилгээ</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          QPay-р төлж, 1–5 минутад WireGuard тохиргоогоо авна.
          Утас болон компьютерт зориулагдсан.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="btn-primary text-base px-8 py-3.5 rounded-xl font-semibold"
          >
            Одоо эхлэх →
          </Link>
          <a
            href="#pricing"
            className="btn-secondary text-base px-8 py-3.5 rounded-xl font-semibold"
          >
            Үнийн мэдээлэл
          </a>
        </div>
      </div>
    </section>
  )
}
