import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { pricingPlans, planPerks } from '@/data/pricing'

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-white">Үнийн мэдээлэл</h2>
          <p className="text-gray-400">QPay-р хялбар, аюулгүй төлбөр хийнэ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${
                plan.highlight
                  ? 'border-brand-500 bg-brand-950/40 shadow-xl shadow-brand-900/30'
                  : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-0.5">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}₮</span>
                </div>
                {plan.save && (
                  <p className="text-emerald-400 text-sm mt-1.5 font-medium">✓ {plan.save}</p>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {planPerks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>

              <Link
                href={`/register?plan=${plan.id}`}
                className={`text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                Сонгох
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
