'use client'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Scale, AlertTriangle, Mail } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
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
              <FileText className="h-4 w-4 mr-2" />
              Terms of Service
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Terms of
              <br />
              <span className="text-dealvize-teal">Service</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              These terms govern your use of Dealvize and outline the rights and 
              responsibilities of both parties.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: January 9, 2025
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12 space-y-12">
            
            {/* Acceptance of Terms */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing or using Dealvize ("the Service"), you agree to be bound by these Terms of Service 
                ("Terms"). If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p className="text-gray-600 leading-relaxed">
                These Terms apply to all visitors, users, and others who access or use the Service, 
                including any content, functionality, and services offered on or through Dealvize.
              </p>
            </div>

            {/* Description of Service */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Dealvize is a Customer Relationship Management (CRM) platform designed specifically for 
                real estate professionals. The Service provides tools for managing client relationships, 
                tracking deals, automating workflows, and analyzing business performance.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any 
                time, with or without notice.
              </p>
            </div>

            {/* User Accounts */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">3. User Accounts</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Account Registration</h3>
                  <p className="text-gray-600 leading-relaxed">
                    To use our Service, you must create an account by providing accurate, complete, and 
                    current information. You are responsible for maintaining the security of your account 
                    and password.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Account Responsibility</h3>
                  <p className="text-gray-600 leading-relaxed">
                    You are responsible for all activities that occur under your account. You must notify 
                    us immediately of any unauthorized use of your account or any other breach of security.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Account Termination</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We reserve the right to terminate or suspend your account at our sole discretion, 
                    without prior notice, for conduct that we believe violates these Terms or is harmful 
                    to other users of the Service.
                  </p>
                </div>
              </div>
            </div>

            {/* Acceptable Use */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">4. Acceptable Use</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. 
                You agree not to use the Service:
              </p>
              
              <div className="bg-red-50 p-6 rounded-lg space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">To violate any applicable law or regulation</span>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">To send spam or unsolicited communications</span>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">To interfere with or disrupt the Service</span>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">To impersonate any person or entity</span>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">To upload or transmit malicious code or viruses</span>
                </div>
              </div>
            </div>

            {/* Subscription and Payment */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">5. Subscription and Payment</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Subscription Plans</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Dealvize offers various subscription plans with different features and usage limits. 
                    Current pricing and plan details are available on our pricing page.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Payment Terms</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Subscription fees are billed in advance on a monthly or annual basis. All fees are 
                    non-refundable except as required by law or as specified in our refund policy.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Free Trial</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We may offer a free trial period. At the end of the trial, your subscription will 
                    automatically convert to a paid plan unless you cancel before the trial ends.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Cancellation</h3>
                  <p className="text-gray-600 leading-relaxed">
                    You may cancel your subscription at any time through your account settings. 
                    Cancellation will take effect at the end of your current billing period.
                  </p>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">6. Intellectual Property</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Content</h3>
                  <p className="text-gray-600 leading-relaxed">
                    The Service and its original content, features, and functionality are and will remain 
                    the exclusive property of Dealvize and its licensors. The Service is protected by 
                    copyright, trademark, and other laws.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Content</h3>
                  <p className="text-gray-600 leading-relaxed">
                    You retain ownership of any content you upload to the Service. By uploading content, 
                    you grant us a license to use, store, and process that content solely to provide the Service.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">DMCA Policy</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We respect intellectual property rights and will respond to notices of alleged 
                    copyright infringement in accordance with the Digital Millennium Copyright Act.
                  </p>
                </div>
              </div>
            </div>

            {/* Data and Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">7. Data and Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your privacy is important to us. Our collection and use of personal information in 
                connection with the Service is governed by our Privacy Policy, which is incorporated 
                by reference into these Terms.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You are responsible for ensuring that any personal data you input into the Service 
                complies with applicable data protection laws and regulations.
              </p>
            </div>

            {/* Disclaimers */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">8. Disclaimers</h2>
              <div className="bg-yellow-50 p-6 rounded-lg">
                <p className="text-yellow-800 leading-relaxed mb-4 font-semibold">
                  IMPORTANT: Please read this section carefully.
                </p>
                <p className="text-yellow-800 leading-relaxed">
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND. WE DISCLAIM ALL 
                  WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF 
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
            </div>

            {/* Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">9. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                IN NO EVENT SHALL DEALVIZE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, 
                DATA, USE, OR GOODWILL.
              </p>
              <p className="text-gray-600 leading-relaxed">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE 
                DURING THE TWELVE MONTHS PRECEDING THE CLAIM.
              </p>
            </div>

            {/* Governing Law */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">10. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of California, 
                United States, without regard to its conflict of law provisions. Any disputes arising 
                from these Terms shall be resolved in the courts of California.
              </p>
            </div>

            {/* Changes to Terms */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">11. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. We will notify you of any 
                material changes by email or through the Service.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Your continued use of the Service after any such changes constitutes your acceptance 
                of the new Terms.
              </p>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">12. Contact Information</h2>
              <div className="bg-dealvize-teal/10 p-6 rounded-lg">
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <div className="flex items-center space-x-2 text-dealvize-teal">
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">legal@dealvize.com</span>
                </div>
              </div>
            </div>

            {/* Effective Date */}
            <div className="border-t border-gray-200 pt-8">
              <p className="text-gray-500 text-center">
                These Terms of Service are effective as of January 9, 2025.
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