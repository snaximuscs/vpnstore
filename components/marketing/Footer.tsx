import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/5 bg-gray-950 pt-12 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          {/* Col 1: Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center font-bold text-xs select-none">
                V
              </div>
              <span className="font-bold text-white">1stCS VPN</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Монголын WireGuard VPN үйлчилгээ. QPay-р минутын дотор холбогдоорой.
            </p>
          </div>

          {/* Col 2: Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              Холбоосууд
            </h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#pricing" className="hover:text-gray-300 transition-colors">Үнэ</a></li>
              <li><Link href="/login" className="hover:text-gray-300 transition-colors">Нэвтрэх</Link></li>
              <li><Link href="/register" className="hover:text-gray-300 transition-colors">Бүртгүүлэх</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              Хуулийн мэдээлэл
            </h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/privacy" className="hover:text-gray-300 transition-colors">Нууцлалын бодлого</Link></li>
              <li><Link href="/terms" className="hover:text-gray-300 transition-colors">Үйлчилгээний нөхцөл</Link></li>
              <li><Link href="/contact" className="hover:text-gray-300 transition-colors">Холбоо барих</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {year} 1stCS VPN. Бүх эрх хуулиар хамгаалагдсан.</p>
          <p>Powered by WireGuard®</p>
        </div>
      </div>
    </footer>
  )
}
