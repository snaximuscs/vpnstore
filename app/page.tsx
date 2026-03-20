import Navbar from '@/components/marketing/Navbar'
import Hero from '@/components/marketing/Hero'
import Features from '@/components/marketing/Features'
import Security from '@/components/marketing/Security'
import Pricing from '@/components/marketing/Pricing'
import HowItWorks from '@/components/marketing/HowItWorks'
import FAQ from '@/components/marketing/FAQ'
import Footer from '@/components/marketing/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Security />
        <Pricing />
        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
