'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, Users, Target, TrendingUp, Clock,
  Check, Star, Menu, X, DollarSign, Trophy,
  Zap, Shield, BarChart3, Smartphone
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

// --- Mock Data ---
const bentoFeatures = [
  {
    title: "Pipeline Visualization",
    description: "Drag-and-drop deals with Kanban-style boards.",
    icon: Target,
    className: "md:col-span-2 md:row-span-2",
    bg: "bg-blue-50/50",
    highlight: "Most Popular"
  },
  {
    title: "AI Lead Scoring",
    description: "Our engine predicts which leads will close next.",
    icon: Zap,
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-amber-50/50"
  },
  {
    title: "Commission Calc",
    description: "Real-time splits & forecasting.",
    icon: DollarSign,
    className: "md:col-span-1 md:row-span-1",
    bg: "bg-emerald-50/50"
  },
  {
    title: "Smart Automation",
    description: "Sequences that nurture leads while you sleep.",
    icon: Clock,
    className: "md:col-span-2 md:row-span-1",
    bg: "bg-purple-50/50"
  }
]

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Top Producer, Keller Williams",
    content: "Dealvize isn't just a CRM, it's my personal assistant. My closing rate jumped 30%.",
    rating: 5,
    avatar: "SJ"
  },
  {
    name: "Michael Chen",
    role: "Broker Owner",
    content: "Finally, a system that actually looks good and makes sense for real estate workflows.",
    rating: 5,
    avatar: "MC"
  },
  {
    name: "Emma Rodriguez",
    role: "Team Lead",
    content: "The automated follow-ups are a game changer. I never miss a birthday or a closing anniversary.",
    rating: 5,
    avatar: "ER"
  }
]

// --- Components ---

// A creative CSS-only representation of the App Dashboard for the Hero
const DashboardMockup = () => (
  <div className="relative mx-auto w-full max-w-[900px] perspective-[2000px] group">
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-500 ease-out [transform:rotateX(5deg)] group-hover:[transform:rotateX(0deg)] overflow-hidden">
      {/* Fake Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="ml-4 h-2 w-32 rounded-full bg-slate-200" />
      </div>

      {/* Fake UI Body */}
      <div className="grid grid-cols-[240px_1fr] h-[400px] md:h-[500px]">
        {/* Sidebar */}
        <div className="border-r border-slate-100 bg-slate-50 p-4 space-y-3 hidden md:block">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/80 transition-colors">
              <div className="h-4 w-4 rounded bg-slate-200" />
              <div className="h-2 w-24 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        {/* Main Content */}
        <div className="p-6 bg-white">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <div className="h-6 w-48 rounded bg-slate-900/10" />
              <div className="h-4 w-32 rounded bg-slate-900/5" />
            </div>
            <div className="h-8 w-24 rounded bg-dealvize-teal" />
          </div>
          {/* Kanban Columns */}
          <div className="grid grid-cols-3 gap-4 h-full">
            {[1, 2, 3].map((col) => (
              <div key={col} className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div className="h-3 w-20 rounded bg-slate-200 mb-2" />
                {[1, 2].map((card) => (
                  <div key={card} className="bg-white p-3 rounded shadow-sm border border-slate-100 space-y-2">
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="flex justify-between">
                      <div className="h-2 w-8 rounded bg-slate-100" />
                      <div className="h-2 w-4 rounded bg-green-100" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Notification Badge */}
      <div className="absolute top-20 right-10 animate-bounce shadow-lg bg-white p-3 rounded-lg border border-dealvize-teal/20 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">Commission Earned</div>
          <div className="text-sm font-bold text-green-600">+$12,450.00</div>
        </div>
      </div>
    </div>

    {/* Glow Effect behind */}
    <div className="absolute -inset-4 -z-10 bg-dealvize-teal/20 blur-3xl opacity-50 rounded-[3rem]" />
  </div>
)

import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { PopupMessageProvider } from "@/contexts/popup-message-context"
import { StructuredData } from "@/components/seo/structured-data"
import { SiteFooter } from "@/components/layout/site-footer"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <ErrorBoundary>
      <PopupMessageProvider>
        <StructuredData type="organization" />
        <StructuredData type="website" />
        <div className="min-h-screen bg-white font-sans selection:bg-dealvize-teal/20">

          {/* --- Navigation --- */}
          <nav className="fixed w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
                  Deal<span className="text-dealvize-teal">vize</span>
                </Link>

                <div className="hidden md:flex items-center space-x-8">
                  <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-dealvize-teal transition-colors">Features</Link>
                  <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-dealvize-teal transition-colors">Pricing</Link>
                  <Link href="/auth/signin" className="text-sm font-medium text-slate-900 hover:opacity-80 transition-opacity">Sign In</Link>
                  <Link href="/auth/signup">
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6">
                      Get Started
                    </Button>
                  </Link>
                </div>

                <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 bg-white px-4 py-6 space-y-4">
                <Link href="#features" className="block text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </Link>
                <Link href="/pricing" className="block text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                  Pricing
                </Link>
                <Link href="/auth/signin" className="block text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/auth/signup" className="block w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-slate-900 text-white">Get Started</Button>
                </Link>
              </div>
            )}
          </nav>

          <main className="pt-16">

            {/* --- Hero Section --- */}
            <section className="relative pt-20 pb-32 overflow-hidden">
              {/* Background Grid Pattern */}
              <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#ccfbf1,transparent)]"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                  {/* Hero Copy */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center rounded-full border border-dealvize-teal/30 bg-dealvize-teal/10 px-3 py-1 text-sm font-medium text-dealvize-teal-dark mb-6">
                      <span className="flex h-2 w-2 rounded-full bg-dealvize-teal mr-2 animate-pulse"></span>
                      New: AI Voice Transcription
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                      The CRM that <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-dealvize-teal to-blue-600">
                        pays for itself.
                      </span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      Stop wrestling with clunky spreadsheets. Dealvize automates your busy work so you can focus on what matters: closing deals.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <Link href="/auth/signup">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-dealvize-teal hover:bg-dealvize-teal-dark text-white shadow-xl shadow-dealvize-teal/20 transition-all hover:-translate-y-1">
                          Start Free Trial
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-slate-50">
                        View Interactive Demo
                      </Button>
                    </div>

                    <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                        ))}
                      </div>
                      <p>Trusted by 1,000+ top producers</p>
                    </div>
                  </div>

                  {/* Hero Visual */}
                  <div className="flex-1 w-full max-w-[600px] lg:max-w-none">
                    <DashboardMockup />
                  </div>
                </div>
              </div>
            </section>

            {/* --- Social Proof Strip --- */}
            <div className="border-y border-slate-100 bg-slate-50/50 py-10">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
                  Empowering agents at
                </p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                  {/* Placeholders for logos - replace with SVGs */}
                  {['Brokerage One', 'Realty Group', 'Estate Prime', 'Modern Home'].map((brand) => (
                    <span key={brand} className="text-xl font-bold font-serif text-slate-800">{brand}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* --- Features Bento Grid --- */}
            <section id="features" className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                    Everything you need to dominate your market
                  </h2>
                  <p className="text-lg text-slate-600">
                    Designed by agents, for agents. We cut the fluff and kept the features that actually print money.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
                  {bentoFeatures.map((feature, i) => (
                    <Card
                      key={i}
                      className={cn(
                        "group relative overflow-hidden border-0 shadow-none ring-1 ring-slate-200 transition-all hover:shadow-xl hover:ring-dealvize-teal/50",
                        feature.className,
                        feature.bg
                      )}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <feature.icon className="h-6 w-6 text-dealvize-teal-dark" />
                          </div>
                          {feature.highlight && (
                            <Badge className="bg-slate-900 text-white hover:bg-slate-800">
                              {feature.highlight}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mt-4 text-xl text-slate-900">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base font-medium text-slate-600">
                          {feature.description}
                        </CardDescription>
                      </CardContent>

                      {/* Decorative background element */}
                      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/40 blur-2xl group-hover:bg-white/60 transition-all" />
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            {/* --- High Contrast "Why" Section --- */}
            <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 blur-3xl opacity-20">
                <div className="h-64 w-64 rounded-full bg-dealvize-teal" />
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                      Stop losing leads to <br />
                      <span className="text-dealvize-teal">chaos.</span>
                    </h2>
                    <ul className="space-y-6">
                      {[
                        "Auto-populate leads from Zillow, Realtor.com, and Facebook",
                        "Smart SMS sequences that respond in under 2 minutes",
                        "Daily \"Money Tasks\" list so you know exactly what to do"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1 h-6 w-6 rounded-full bg-dealvize-teal/20 flex items-center justify-center shrink-0">
                            <Check className="h-4 w-4 text-dealvize-teal" />
                          </div>
                          <span className="text-lg text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative">
                    {/* Abstract visual of "Order from Chaos" */}
                    <div className="grid gap-4 opacity-90">
                      <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 transform translate-x-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-sm font-mono text-slate-400">Old Way</span>
                        </div>
                        <div className="text-slate-500 text-sm">Spreadsheets, sticky notes, missed calls...</div>
                      </div>
                      <div className="p-6 rounded-xl bg-gradient-to-r from-dealvize-teal to-emerald-500 shadow-2xl transform -translate-x-4 scale-105 z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-2 w-2 rounded-full bg-white" />
                          <span className="text-sm font-mono text-white/80">Dealvize Way</span>
                        </div>
                        <div className="text-white font-bold text-lg">Automated. Organized. Profitable.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* --- Testimonials --- */}
            <section className="py-24 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center mb-16">Results speak louder than words</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative">
                      <div className="flex text-yellow-400 mb-4">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                      </div>
                      <p className="text-slate-700 italic mb-6">"{t.content}"</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-dealvize-teal/20 flex items-center justify-center font-bold text-dealvize-teal-dark">
                          {t.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">{t.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* --- Final CTA --- */}
            <section className="py-32 bg-white relative overflow-hidden">
              <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                  Ready to scale your business?
                </h2>
                <p className="text-xl text-slate-600 mb-10">
                  Join the CRM built for the modern real estate era. No credit card required for trial.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup">
                    <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </div>
              {/* Background decoration */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] bg-dealvize-teal/5 rounded-full blur-3xl" />
            </section>
          </main>
          <SiteFooter />
          <Toaster />
        </div>
      </PopupMessageProvider>
    </ErrorBoundary>
  )
}
