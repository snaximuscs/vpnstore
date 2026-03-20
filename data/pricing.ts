/**
 * data/pricing.ts
 * Pricing plans and shared perks for the marketing homepage.
 * Rendered by components/marketing/Pricing.tsx.
 */

export interface PricingPlan {
  id: string
  name: string
  price: string
  desc: string
  highlight: boolean
  badge?: string
  save?: string
}

export const pricingPlans: PricingPlan[] = [
  {
    id: '1m',
    name: '1 Сар',
    price: '9,900',
    desc: 'Туршихад тохиромжтой',
    highlight: false,
  },
  {
    id: '3m',
    name: '3 Сар',
    price: '25,900',
    desc: 'Хамгийн эрэлттэй',
    highlight: true,
    badge: 'Алдартай',
    save: '3,800₮ хэмнэнэ',
  },
  {
    id: '6m',
    name: '6 Сар',
    price: '45,900',
    desc: 'Хамгийн сайн үнэ',
    highlight: false,
    save: '13,500₮ хэмнэнэ',
  },
]

export const planPerks: string[] = [
  'WireGuard тохиргоо файл',
  'Хязгааргүй хурд',
  'QR код дэмжлэг',
  '24/7 онлайн сервер',
  'Нэг дарснаар холболт',
]
