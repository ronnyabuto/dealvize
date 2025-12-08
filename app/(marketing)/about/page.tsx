'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Target, 
  TrendingUp, 
  Award, 
  Heart, 
  Lightbulb, 
  ArrowRight,
  Building,
  Clock,
  Star
} from "lucide-react"
import Link from "next/link"

const teamMembers = [
  {
    name: "Alex Thompson",
    role: "CEO & Co-Founder",
    bio: "Former real estate agent with 15+ years experience. Built Dealvize to solve the pain points he experienced firsthand.",
    image: "/team/alex.jpg"
  },
  {
    name: "Sarah Chen",
    role: "CTO & Co-Founder", 
    bio: "Ex-Salesforce engineer passionate about creating intuitive CRM solutions for real estate professionals.",
    image: "/team/sarah.jpg"
  },
  {
    name: "Marcus Rodriguez",
    role: "Head of Product",
    bio: "Product strategist with deep expertise in real estate workflows and user experience design.",
    image: "/team/marcus.jpg"
  }
]

const values = [
  {
    icon: Heart,
    title: "Customer-First",
    description: "Every feature we build starts with understanding our users' real needs and challenges."
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We leverage cutting-edge technology to simplify complex real estate processes."
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We maintain the highest standards in product quality, security, and customer support."
  },
  {
    icon: Users,
    title: "Partnership",
    description: "We see ourselves as partners in our customers' success, not just a software provider."
  }
]

const stats = [
  { number: "1000+", label: "Real Estate Professionals" },
  { number: "$2.5B+", label: "Pipeline Value Managed" },
  { number: "98%", label: "Customer Satisfaction" },
  { number: "24/7", label: "Customer Support" }
]

export default function AboutPage() {
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
            
            <div className="flex items-center space-x-8">
              <Link href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-dealvize-teal font-semibold">
                About
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                Contact
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-8">
              Our Story
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Building the future of
              <br />
              <span className="text-dealvize-teal">real estate CRM</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Founded by real estate professionals who understand the industry's unique challenges, 
              Dealvize was born from the need for a truly intuitive CRM that actually helps you close more deals.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl font-bold text-dealvize-teal">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Why we built Dealvize
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  As practicing real estate agents, we spent years frustrated with clunky, 
                  overly complex CRM systems that seemed built for enterprise sales teams, 
                  not real estate professionals.
                </p>
                <p>
                  We needed something that understood the unique rhythm of real estate: 
                  the long sales cycles, the emotional journey of buyers and sellers, 
                  the importance of relationships, and the complexity of commission tracking.
                </p>
                <p>
                  So we built Dealvize - a CRM designed specifically for how real estate 
                  professionals actually work. Simple enough to use daily, powerful enough 
                  to scale your business.
                </p>
              </div>
            </div>
            
            <Card className="bg-white shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Building className="h-8 w-8 text-dealvize-teal mr-3" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Founded in 2023</h3>
                    <p className="text-sm text-gray-500">San Francisco, CA</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Started as a weekend project to solve our own CRM frustrations. 
                  Now trusted by over 1000 real estate professionals nationwide.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  Growing 40% month-over-month
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Our values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-dealvize-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-8 w-8 text-dealvize-teal" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Meet our team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real estate professionals building for real estate professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="text-center bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-dealvize-teal to-dealvize-teal-dark rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Users className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-2">{member.name}</h3>
                  <p className="text-dealvize-teal font-medium mb-4">{member.role}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to join our mission?
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8 max-w-2xl mx-auto">
            Experience the CRM built specifically for real estate professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white hover:text-dealvize-teal">
                Contact Sales
              </Button>
            </Link>
          </div>
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
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
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