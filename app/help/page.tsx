'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Video, 
  Users, 
  Settings, 
  BarChart3,
  Mail,
  Phone,
  ChevronRight,
  HelpCircle,
  PlayCircle,
  FileText
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Set up your account and learn the basics",
    articles: [
      "Creating your first account",
      "Setting up your profile",
      "Inviting team members",
      "Understanding the dashboard",
      "Importing your first contacts"
    ]
  },
  {
    icon: Users,
    title: "Managing Clients",
    description: "Add, organize, and track your clients",
    articles: [
      "Adding new clients",
      "Client profiles and history",
      "Client communication tracking",
      "Client segmentation",
      "Managing client relationships"
    ]
  },
  {
    icon: Settings,
    title: "Deals & Pipeline",
    description: "Track deals through your sales process",
    articles: [
      "Creating and managing deals",
      "Customizing your pipeline stages",
      "Deal forecasting",
      "Commission tracking",
      "Pipeline automation"
    ]
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Understand your business performance",
    articles: [
      "Dashboard metrics explained",
      "Generating reports",
      "Performance analytics",
      "Commission reports",
      "Team performance tracking"
    ]
  }
]

const popularArticles = [
  {
    title: "How to import contacts from Excel",
    category: "Getting Started",
    views: "2.5k views"
  },
  {
    title: "Setting up automated follow-ups",
    category: "Automation", 
    views: "1.8k views"
  },
  {
    title: "Understanding commission calculations",
    category: "Deals & Pipeline",
    views: "1.6k views"
  },
  {
    title: "Managing team permissions",
    category: "Team Management",
    views: "1.2k views"
  },
  {
    title: "Integrating with MLS systems",
    category: "Integrations",
    views: "950 views"
  }
]

const quickHelp = [
  {
    icon: Video,
    title: "Video Tutorials",
    description: "Step-by-step video guides",
    action: "Watch Now"
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our support team",
    action: "Start Chat"
  },
  {
    icon: Mail,
    title: "Email Support", 
    description: "Get help via email",
    action: "Send Email"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Speak with our experts",
    action: "Call Now"
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-8">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help Center
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            How can we
            <br />
            <span className="text-dealvize-teal">help you?</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Find answers to common questions, browse our guides, or get in touch with our support team.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for articles, guides, or tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg border-gray-200 rounded-xl focus:ring-dealvize-teal focus:border-dealvize-teal"
            />
            <Button className="absolute right-2 top-2 bg-dealvize-teal hover:bg-dealvize-teal-dark">
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Help */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Get help instantly</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the support method that works best for you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickHelp.map((help, index) => (
              <Card key={index} className="text-center border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-dealvize-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-dealvize-teal/20 transition-colors">
                    <help.icon className="h-8 w-8 text-dealvize-teal" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{help.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{help.description}</p>
                  <Button variant="outline" size="sm" className="group-hover:border-dealvize-teal group-hover:text-dealvize-teal">
                    {help.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Popular articles</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The most helpful guides and tutorials used by our community
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                {popularArticles.map((article, index) => (
                  <div key={index} className={`flex items-center justify-between p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    index !== popularArticles.length - 1 ? 'border-b border-gray-100' : ''
                  }`}>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{article.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <span>{article.views}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Browse by category</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find detailed guides and tutorials organized by topic
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-dealvize-teal/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-dealvize-teal/20 transition-colors">
                      <category.icon className="h-6 w-6 text-dealvize-teal" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-slate-900 group-hover:text-dealvize-teal transition-colors">
                        {category.title}
                      </CardTitle>
                      <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <div key={articleIndex} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-dealvize-teal transition-colors cursor-pointer">
                        <FileText className="h-3 w-3" />
                        <span>{article}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4 p-0 text-dealvize-teal hover:text-dealvize-teal-dark">
                    View all articles
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Resources */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Video tutorials</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Learn Dealvize with our comprehensive video guides
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-dealvize-teal to-dealvize-teal-dark rounded-t-lg p-8 text-center">
                  <PlayCircle className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-white font-semibold">Getting Started Series</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Complete walkthrough of setting up your Dealvize account and getting your first deals in the system.
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>6 videos</span>
                    <span>45 min total</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-purple-500 to-purple-700 rounded-t-lg p-8 text-center">
                  <PlayCircle className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-white font-semibold">Advanced Features</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Learn about automation, integrations, team management, and advanced reporting features.
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>8 videos</span>
                    <span>1.2 hours total</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-green-500 to-green-700 rounded-t-lg p-8 text-center">
                  <PlayCircle className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-white font-semibold">Best Practices</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Tips and strategies from successful real estate professionals using Dealvize.
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>4 videos</span>
                    <span>30 min total</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Still need help?
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8 max-w-2xl mx-auto">
            Our support team is here to help you succeed with Dealvize.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="px-8">
                Contact Support
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white hover:text-dealvize-teal">
              Schedule Demo
            </Button>
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