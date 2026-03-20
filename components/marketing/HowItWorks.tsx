const steps = [
  { n: '01', title: 'Бүртгүүлэх', desc: 'Имэйл болон нууц үгээ оруулж, имэйл баталгаажуулна.' },
  { n: '02', title: 'Эрх сонгох', desc: '1, 3 эсвэл 6 сарын тариф сонгоно.' },
  { n: '03', title: 'QPay төлбөр', desc: 'QPay апп нээж QR скан хийж төлнө.' },
  { n: '04', title: 'Тохиргоо авах', desc: '1–5 минутад VPN тохиргоо дашбоардад гарна.' },
]

export default function HowItWorks() {
  return (
    <section className="py-20 px-4 border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-white">Хэрхэн ажилладаг вэ?</h2>
          <p className="text-gray-400">4 алхамд VPN ашиглаж эхэлнэ</p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-brand-800/40 -z-0" />

          {steps.map((s) => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-900/60 border border-brand-700/40 flex items-center justify-center mb-4 z-10 bg-gray-950">
                <span className="text-brand-300 font-bold text-lg">{s.n}</span>
              </div>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
