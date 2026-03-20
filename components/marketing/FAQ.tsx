'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqItems } from '@/data/faq'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i))

  return (
    <section className="py-20 px-4 border-t border-white/5">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-white">Түгээмэл асуултууд</h2>
          <p className="text-gray-400">Хамгийн их асуугддаг асуултуудад хариулав</p>
        </div>

        <div className="space-y-2">
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i
            const panelId = `faq-panel-${i}`
            const headerId = `faq-header-${i}`
            return (
              <div
                key={i}
                className="rounded-xl border border-white/5 bg-gray-900/60 overflow-hidden"
              >
                <button
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-white font-medium hover:bg-gray-800/40 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 flex-shrink-0 ml-3 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  style={{ maxHeight: isOpen ? '500px' : '0' }}
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                >
                  <p className="px-5 pb-4 text-gray-400 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
