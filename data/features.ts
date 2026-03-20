/**
 * data/features.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Static data for the Features section on the marketing homepage.
 * Each item maps to a FeatureCard in components/marketing/Features.tsx.
 *
 * Icon names reference lucide-react exports — imported dynamically in the
 * component so this file stays plain data with no React dependency.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Feature {
  /** lucide-react icon component name */
  icon: string
  title: string
  description: string
}

export const features: Feature[] = [
  {
    icon: 'Zap',
    title: 'WireGuard протокол',
    description:
      'Хамгийн хурдан, орчин үеийн VPN протокол. Бага хоцролт, өндөр гүйцэтгэл — видео дуудлага ч тасарахгүй.',
  },
  {
    icon: 'Shield',
    title: 'Цэргийн шифрлэлт',
    description:
      'ChaCha20 + Poly1305 шифрлэлтээр таны бүх интернэт трафик цэрэгт зэрэглэлийн аюулгүй байдлаар хамгаалагдана.',
  },
  {
    icon: 'Globe',
    title: 'Бүх трафик чиглэлт',
    description:
      '0.0.0.0/0 чиглэлтээр DNS алдагдалгүй бүрэн хамгаалалт. Нэг дарснаар бүх урсгал VPN-р дамжина.',
  },
  {
    icon: 'Smartphone',
    title: 'QR код тохиргоо',
    description:
      'iOS болон Android WireGuard апп-д QR скан хийж секундэд холбогдоно. Гараар тохируулах шаардлагагүй.',
  },
  {
    icon: 'Settings',
    title: 'Автомат тохиргоо',
    description:
      'Төлбөр хийсний дараа 1–5 минутад тохиргоо автоматаар бэлэн болно. Дашбоардаас шууд татаж авна.',
  },
  {
    icon: 'CreditCard',
    title: 'QPay дэмжлэг',
    description:
      'Монголын QPay системээр хялбар, аюулгүй, хурдан төлбөр хийнэ. Банкны карт, дансны мэдээлэл шаардлагагүй.',
  },
]
