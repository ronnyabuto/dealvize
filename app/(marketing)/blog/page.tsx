'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Search, ArrowRight, Menu, X, User } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

// Mock blog posts - in a real app, this would come from your CMS/database
const blogPosts = [
  {
    id: 1,
    title: "Advanced CRM Analytics: Boosting Deal Conversion by 40%",
    excerpt: "Learn how data-driven insights from your CRM can identify bottlenecks in your pipeline and optimize conversion rates with actionable metrics.",
    author: "Sarah Johnson, Data Analyst",
    date: "2024-01-15",
    readTime: "8 min read",
    category: "CRM Analytics",
    slug: "advanced-crm-analytics-deal-conversion",
    featured: true
  },
  {
    id: 2,
    title: "Pipeline Management: From Lead to Close in 6 Steps",
    excerpt: "Master the art of visual pipeline management with proven workflows that reduce deal cycle time and increase closing rates.",
    author: "Michael Chen, Sales Director",
    date: "2024-01-12",
    readTime: "6 min read",
    category: "Pipeline Management",
    slug: "pipeline-management-lead-to-close",
    featured: false
  },
  {
    id: 3,
    title: "Commission Tracking Automation: Save 10 Hours Weekly",
    excerpt: "Eliminate manual commission calculations with smart automation tools. Learn how top agents track splits, payments, and forecasts effortlessly.",
    author: "Emma Rodriguez, CRM Specialist",
    date: "2024-01-10",
    readTime: "12 min read",
    category: "Automation",
    slug: "commission-tracking-automation-guide",
    featured: true
  },
  {
    id: 4,
    title: "Client Behavior Analytics: Understanding Your Database",
    excerpt: "Leverage client interaction data to personalize outreach, predict needs, and identify high-value opportunities in your database.",
    author: "David Kim, Business Intelligence",
    date: "2024-01-08",
    readTime: "7 min read",
    category: "Client Analytics",
    slug: "client-behavior-analytics-database",
    featured: false
  },
  {
    id: 5,
    title: "Real Estate KPIs That Drive Revenue Growth",
    excerpt: "Discover the 12 essential metrics every real estate professional should track to optimize performance and maximize revenue.",
    author: "Lisa Thompson, Performance Coach",
    date: "2024-01-05",
    readTime: "10 min read",
    category: "Performance Metrics",
    slug: "real-estate-kpis-revenue-growth",
    featured: false
  },
  {
    id: 6,
    title: "Workflow Automation: 5 Tasks to Automate Today",
    excerpt: "Streamline your daily operations with smart automation. From follow-ups to document generation, boost productivity by 60%.",
    author: "Robert Anderson, Process Expert",
    date: "2024-01-03",
    readTime: "9 min read",
    category: "Workflow Automation",
    slug: "workflow-automation-tasks-productivity",
    featured: false
  }
]

const categories = ["All", "CRM Analytics", "Pipeline Management", "Automation", "Client Analytics", "Performance Metrics", "Workflow Automation"]

export default function BlogPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredPosts = blogPosts.filter(post => post.featured)

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
              <Link href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-900 font-medium">
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
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link 
                  href="/blog" 
                  className="text-gray-900 font-medium"
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
      <section className="py-20 bg-gradient-to-br from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              CRM Insights & Analytics
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Data-driven strategies, automation guides, and advanced CRM techniques to optimize your pipeline and boost conversion rates.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search articles..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedCategory === category 
                      ? "bg-dealvize-teal hover:bg-dealvize-teal-dark" 
                      : "hover:bg-slate-100"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === "All" && searchTerm === "" && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow group">
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">
                      {post.category}
                    </Badge>
                    <CardTitle className="group-hover:text-dealvize-teal transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {post.author}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(post.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {post.readTime}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            {selectedCategory === "All" ? "Latest Articles" : `${selectedCategory} Articles`}
            {searchTerm && (
              <span className="text-gray-600 font-normal text-lg ml-2">
                - Search results for "{searchTerm}"
              </span>
            )}
          </h2>
          
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No articles found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedCategory("All")
                  setSearchTerm("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow group">
                    <CardHeader>
                      <Badge variant="secondary" className="w-fit mb-2">
                        {post.category}
                      </Badge>
                      <CardTitle className="group-hover:text-dealvize-teal transition-colors">
                        <Link href={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {post.author}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(post.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {post.readTime}
                        </div>
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <Button variant="outline" size="sm" className="group-hover:bg-dealvize-teal group-hover:text-white group-hover:border-dealvize-teal transition-colors">
                          Read More
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination would go here in a real app */}
              <div className="text-center mt-12">
                <Button variant="outline" size="lg">
                  Load More Articles
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Master your CRM analytics
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8">
            Get advanced CRM strategies, automation guides, and data insights delivered to your inbox weekly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              placeholder="Enter your email"
              className="bg-white"
            />
            <Button variant="secondary" className="whitespace-nowrap">
              Subscribe
            </Button>
          </div>
          <p className="text-sm text-dealvize-teal-light mt-4">
            No spam. Unsubscribe anytime.
          </p>
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