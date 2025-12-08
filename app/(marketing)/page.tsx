'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, Target, TrendingUp, Clock, Check, Star, Menu, X, DollarSign, Trophy } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const features = [
  {
    icon: Users,
    title: "Advanced Client Analytics",
    description: "Track client behavior, preferences, and engagement with detailed analytics dashboards and interaction history.",
    highlight: "360° Client View"
  },
  {
    icon: Target,
    title: "Visual Deal Pipeline",
    description: "Drag-and-drop deals through customizable stages with real-time progress tracking and forecasting.",
    highlight: "Kanban-Style Board"
  },
  {
    icon: TrendingUp,
    title: "Smart Commission Engine",
    description: "Automated commission calculations with split tracking, payment schedules, and performance analytics.",
    highlight: "Real-Time Calculations"
  },
  {
    icon: Clock,
    title: "AI-Powered Automation",
    description: "Intelligent task creation, follow-up reminders, and workflow automation based on deal stage and client activity.",
    highlight: "Smart Workflows"
  }
]

const heroMetrics = [
  { label: "Pipeline Value", value: "$4.2M+", icon: DollarSign },
  { label: "Active Deals", value: "150+", icon: Target },
  { label: "Success Rate", value: "89%", icon: Trophy },
  { label: "Time Saved", value: "12hrs/week", icon: Clock }
]

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Realtor",
    content: "Dealvize has transformed how I manage my deals. I've increased my closing rate by 30% in just 6 months.",
    rating: 5
  },
  {
    name: "Michael Chen",
    role: "Broker",
    content: "The pipeline visualization is incredible. I can see exactly where each deal stands at a glance.",
    rating: 5
  },
  {
    name: "Emma Rodriguez",
    role: "Office Administrator",
    content: "The automated follow-ups have saved me hours each week. Our clients love the consistent communication.",
    rating: 5
  }
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-slate-900">
                Deal<span className="text-dealvize-teal">vize</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">
                Blog
              </Link>
              <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <Link 
                  href="#features" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link 
                  href="/blog" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link 
                  href="/auth/signin" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-8">
              Trusted by 1000+ Real Estate Professionals
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 mb-6">
              Close More Deals with
              <br />
              <span className="text-dealvize-teal">Intelligent CRM</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your real estate business with our comprehensive CRM. 
              Manage clients, track deals, automate follow-ups, and increase your closing rate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8">
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Credit card required • 7-day free trial • Cancel anytime
            </p>

            {/* Hero Metrics */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {heroMetrics.map((metric, index) => (
                <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="w-8 h-8 bg-dealvize-teal/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <metric.icon className="h-4 w-4 text-dealvize-teal" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{metric.value}</div>
                    <div className="text-xs text-gray-600">{metric.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for real estate professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-dealvize-teal to-dealvize-teal/50" />
                <CardHeader>
                  <div className="w-12 h-12 bg-dealvize-teal/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-dealvize-teal/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-dealvize-teal" />
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs mb-2">
                    {feature.highlight}
                  </Badge>
                  <CardTitle className="text-slate-900 group-hover:text-dealvize-teal transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loved by real estate professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our users are saying about Dealvize
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to close more deals?
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8 max-w-2xl mx-auto">
            Join thousands of real estate professionals who trust Dealvize to grow their business.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="px-8">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="text-2xl font-bold">
                Deal<span className="text-dealvize-teal">vize</span>
              </Link>
              <p className="text-gray-400 mt-4">
                The modern CRM for real estate professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
                <li><Link href="/auth/signin" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Dealvize. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}