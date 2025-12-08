'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight, Menu, X, Users } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for individual agents getting started",
    popular: false,
    userCount: "1 User",
    features: [
      "1 User included",
      "Up to 100 clients",
      "Up to 50 active deals",
      "Basic pipeline management",
      "Email templates",
      "Task management",
      "Mobile app access",
      "Email support"
    ]
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "Ideal for small teams and growing agencies",
    popular: true,
    userCount: "2-4 Users",
    features: [
      "2-4 Users included",
      "Up to 500 clients",
      "Unlimited deals",
      "Advanced pipeline management",
      "Automated follow-ups",
      "Custom email sequences",
      "Team collaboration",
      "Advanced reporting",
      "Commission tracking",
      "Integrations (Zapier, etc.)",
      "Priority support"
    ]
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/month",
    description: "For established brokerages and teams",
    popular: false,
    userCount: "5-10 Users",
    features: [
      "5-10 Users included",
      "Unlimited clients",
      "Unlimited deals",
      "Full team management",
      "Advanced analytics & reporting",
      "Custom branding",
      "API access",
      "White-label options",
      "Lead assignment & routing",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support"
    ]
  },
  {
    name: "Brokerage",
    price: "Custom",
    period: "",
    description: "Need more than 10 users? Manage a brokerage or large team?",
    popular: false,
    userCount: "10+ Users",
    isCustom: true,
    features: [
      "Unlimited users",
      "Unlimited clients & deals",
      "Multi-location support",
      "Advanced brokerage management",
      "Custom onboarding & training",
      "Enterprise-grade security",
      "Custom integrations & APIs",
      "Dedicated infrastructure",
      "White-label & co-branding",
      "Advanced compliance tools",
      "Dedicated customer success team",
      "24/7 premium support"
    ]
  }
]

const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and you'll be prorated for any difference."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, we offer a 7-day free trial on all plans. Credit card required to start your trial."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. Annual subscriptions receive a 20% discount."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. You can cancel your subscription at any time. Your data will remain accessible until the end of your billing period."
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! Pay annually and save 20% on any plan. Plus, you'll get priority support and early access to new features."
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use enterprise-grade encryption, regular backups, and comply with industry standards to keep your data safe."
  }
]

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="min-h-screen bg-white">
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
              <Link href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-900 font-medium">
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
                  href="/#features" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-gray-900 font-medium"
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
      <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Choose the perfect plan based on your team size. From individual agents to large brokerages, we have you covered. All plans include a 7-day free trial.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <span className={`mr-3 ${billingPeriod === 'monthly' ? 'text-slate-900 font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-dealvize-teal focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-6 bg-dealvize-teal' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${billingPeriod === 'annual' ? 'text-slate-900 font-medium' : 'text-gray-500'}`}>
              Annual
            </span>
            {billingPeriod === 'annual' && (
              <Badge variant="secondary" className="ml-2">
                Save 20%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-dealvize-teal border-2' : 'border-gray-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-dealvize-teal text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-dealvize-teal border-dealvize-teal">
                      {plan.userCount}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 mt-3">{plan.description}</CardDescription>
                  <div className="mt-6">
                    {plan.isCustom ? (
                      <div>
                        <span className="text-4xl font-bold text-slate-900">Custom</span>
                        <div className="text-sm text-gray-600 mt-1">Pricing</div>
                      </div>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-slate-900">
                          {billingPeriod === 'annual' ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}` : plan.price}
                        </span>
                        <span className="text-gray-600">{plan.period}</span>
                        {billingPeriod === 'annual' && (
                          <div className="text-sm text-green-600 mt-1">
                            Save ${Math.round(parseInt(plan.price.replace('$', '')) * 0.2 * 12)} annually
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-dealvize-teal mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.isCustom ? (
                    <Link href="/contact" className="block">
                      <Button 
                        className="w-full bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
                      >
                        Contact Sales
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/auth/signup?plan=${plan.name}`} className="block">
                      <Button 
                        className={`w-full ${plan.popular 
                          ? 'bg-dealvize-teal hover:bg-dealvize-teal-dark text-white' 
                          : 'bg-white hover:bg-gray-50 text-slate-900 border border-gray-300'
                        }`}
                      >
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8 max-w-2xl mx-auto">
            Start your 7-day free trial today. Credit card required.
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