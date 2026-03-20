'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl transition-all duration-200 ${
        scrolled ? 'border-b border-white/10 shadow-sm shadow-black/40' : 'border-b border-white/5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-sm select-none">
            V
          </div>
          <span className="font-bold text-lg tracking-tight text-white">1stCS VPN</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/login" className="btn-secondary py-2 px-4 text-sm">
            Нэвтрэх
          </Link>
          <Link href="/register" className="btn-primary py-2 px-4 text-sm">
            Бүртгүүлэх
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Цэс хаах' : 'Цэс нээх'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-200 ${
          menuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-white/5 pt-3">
          <Link
            href="/login"
            className="btn-secondary w-full text-center py-2.5 text-sm"
            onClick={() => setMenuOpen(false)}
          >
            Нэвтрэх
          </Link>
          <Link
            href="/register"
            className="btn-primary w-full text-center py-2.5 text-sm"
            onClick={() => setMenuOpen(false)}
          >
            Бүртгүүлэх
          </Link>
        </div>
      </div>
    </nav>
  )
}
