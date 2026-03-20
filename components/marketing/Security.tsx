import { EyeOff, Lock, Shield, Server } from 'lucide-react'

const badges = [
  {
    icon: EyeOff,
    label: 'Лог хадгалдаггүй',
    desc: 'Таны интернэт үйл ажиллагааны аливаа бүртгэлийг хэзээ ч хадгалдаггүй.',
  },
  {
    icon: Lock,
    label: 'Цэргийн шифрлэлт',
    desc: 'ChaCha20-Poly1305 шифрлэлт — орчин үеийн хамгийн найдвартай стандарт.',
  },
  {
    icon: Shield,
    label: 'DNS алдагдалгүй',
    desc: 'Бүх DNS хүсэлт VPN тунелаар дамжина. Гуравдагч этгээдэд харагдахгүй.',
  },
  {
    icon: Server,
    label: '24/7 Uptime',
    desc: '1 Gbps суваг бүхий серверүүд жилийн 365 хоног тасралтгүй ажиллана.',
  },
]

export default function Security() {
  return (
    <section className="py-20 px-4 border-t border-white/5 bg-gray-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-white">
            Таны аюулгүй байдал бидний тэргүүлэх зорилго
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Нэр нууц байдал болон өгөгдлийн хамгаалалтад найдвартай шийдлүүдийг ашигладаг
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {badges.map((b) => {
            const Icon = b.icon
            return (
              <div
                key={b.label}
                className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/5 bg-gray-900/60 hover:border-brand-700/40 hover:bg-gray-900/80 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-900/60 border border-brand-800/40 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{b.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
