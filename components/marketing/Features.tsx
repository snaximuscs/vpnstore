import { Zap, Shield, Globe, Smartphone, Settings, CreditCard, LucideIcon } from 'lucide-react'
import { features } from '@/data/features'

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Shield,
  Globe,
  Smartphone,
  Settings,
  CreditCard,
}

export default function Features() {
  return (
    <section className="py-20 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-white">Яагаад 1stCS VPN?</h2>
          <p className="text-gray-400">Орчин үеийн WireGuard технологи дээр бүтээгдсэн</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = iconMap[f.icon] ?? Zap
            return (
              <div
                key={f.title}
                className="card group hover:border-brand-700/40 hover:bg-gray-900/60 hover:shadow-lg hover:shadow-brand-900/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-900/60 border border-brand-800/40 flex items-center justify-center mb-4 group-hover:bg-brand-800/50 transition-colors">
                  <Icon size={18} className="text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
