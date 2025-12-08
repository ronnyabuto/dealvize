'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, UserCheck, Mail, AlertTriangle } from "lucide-react"
import Link from "next/link"

const privacyPrinciples = [
  {
    icon: Lock,
    title: "Data Encryption",
    description: "All data is encrypted in transit and at rest using industry-standard AES-256 encryption."
  },
  {
    icon: Eye,
    title: "Minimal Collection",
    description: "We only collect data necessary to provide our services and improve your experience."
  },
  {
    icon: UserCheck,
    title: "User Control",
    description: "You have complete control over your data with options to export or delete at any time."
  },
  {
    icon: Shield,
    title: "Secure Infrastructure",
    description: "Hosted on enterprise-grade infrastructure with regular security audits and monitoring."
  }
]

export default function PrivacyPage() {
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
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-8">
              <Shield className="h-4 w-4 mr-2" />
              Privacy Policy
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Your privacy is
              <br />
              <span className="text-dealvize-teal">our priority</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We're committed to protecting your personal information and being transparent 
              about how we collect, use, and safeguard your data.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: January 9, 2025
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Principles */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our privacy principles</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These principles guide how we handle your data across all our services
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {privacyPrinciples.map((principle, index) => (
              <Card key={index} className="text-center border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-dealvize-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <principle.icon className="h-8 w-8 text-dealvize-teal" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-3">{principle.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{principle.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12 space-y-12">
            
            {/* Information We Collect */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Information We Collect</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Account Information</h3>
                  <p className="text-gray-600 leading-relaxed">
                    When you create a Dealvize account, we collect basic information such as your name, 
                    email address, phone number, and company details. This information is necessary to 
                    provide our CRM services and communicate with you about your account.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">CRM Data</h3>
                  <p className="text-gray-600 leading-relaxed">
                    As a CRM platform, we store the business data you input, including client information, 
                    deal details, tasks, notes, and communications. This data belongs to you and is only 
                    used to provide our CRM functionality.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Usage Information</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We collect information about how you use Dealvize, including features accessed, 
                    pages visited, and general usage patterns. This helps us improve our service and 
                    provide better support.
                  </p>
                </div>
              </div>
            </div>

            {/* How We Use Your Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">How We Use Your Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-dealvize-teal/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-dealvize-teal rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Service Provision</h4>
                    <p className="text-gray-600">Provide, maintain, and improve our CRM platform and features</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-dealvize-teal/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-dealvize-teal rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Communication</h4>
                    <p className="text-gray-600">Send important updates, security alerts, and support messages</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-dealvize-teal/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-dealvize-teal rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Product Improvement</h4>
                    <p className="text-gray-600">Analyze usage patterns to enhance features and user experience</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-dealvize-teal/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-dealvize-teal rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Legal Compliance</h4>
                    <p className="text-gray-600">Comply with legal obligations and protect our rights and interests</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                We implement industry-standard security measures to protect your data:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-dealvize-teal" />
                  <span className="text-slate-900 font-medium">End-to-end encryption for all data transmission</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-dealvize-teal" />
                  <span className="text-slate-900 font-medium">AES-256 encryption for data at rest</span>
                </div>
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-5 w-5 text-dealvize-teal" />
                  <span className="text-slate-900 font-medium">Multi-factor authentication available</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-dealvize-teal" />
                  <span className="text-slate-900 font-medium">Regular security audits and monitoring</span>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Data Sharing</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                We do not sell your personal information. We may share your data only in these limited circumstances:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Service Providers</h4>
                  <p className="text-gray-600">
                    We work with trusted third-party service providers (hosting, email, analytics) who 
                    help us operate our platform. These providers are contractually bound to protect your data.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Legal Requirements</h4>
                  <p className="text-gray-600">
                    We may disclose information if required by law, court order, or to protect the 
                    rights, property, or safety of Dealvize, our users, or others.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Business Transfers</h4>
                  <p className="text-gray-600">
                    If Dealvize is involved in a merger, acquisition, or sale of assets, your data 
                    may be transferred as part of that transaction.
                  </p>
                </div>
              </div>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                You have the following rights regarding your personal data:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Access & Export</h4>
                  <p className="text-gray-600 text-sm">
                    Request a copy of your personal data and export your CRM data at any time.
                  </p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Correction</h4>
                  <p className="text-gray-600 text-sm">
                    Update or correct your personal information through your account settings.
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Deletion</h4>
                  <p className="text-gray-600 text-sm">
                    Delete your account and associated data, subject to legal retention requirements.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Portability</h4>
                  <p className="text-gray-600 text-sm">
                    Export your data in a structured, machine-readable format.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Us</h2>
              <div className="bg-dealvize-teal/10 p-6 rounded-lg">
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have questions about this privacy policy or want to exercise your rights, 
                  please contact us:
                </p>
                <div className="flex items-center space-x-2 text-dealvize-teal">
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">privacy@dealvize.com</span>
                </div>
              </div>
            </div>

            {/* Updates */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Policy Updates</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any 
                material changes by email or through our platform. Your continued use of Dealvize 
                after such modifications constitutes your acknowledgment of the modified policy.
              </p>
            </div>
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