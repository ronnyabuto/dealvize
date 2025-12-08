'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Calendar, User } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

// Mock blog posts data - in a real app, this would come from your database
const mockPosts = [
  {
    id: 1,
    title: "10 Essential Tips for Real Estate Lead Generation in 2024",
    status: "published",
    author: "Sarah Johnson",
    publishDate: "2024-01-15",
    category: "Lead Generation",
    views: 1248,
    slug: "real-estate-lead-generation-tips-2024"
  },
  {
    id: 2,
    title: "How to Build Stronger Client Relationships in Real Estate",
    status: "published",
    author: "Michael Chen",
    publishDate: "2024-01-12",
    category: "Client Relations",
    views: 892,
    slug: "building-stronger-client-relationships"
  },
  {
    id: 3,
    title: "The Complete Guide to Real Estate CRM Selection",
    status: "draft",
    author: "Emma Rodriguez",
    publishDate: null,
    category: "Technology",
    views: 0,
    slug: "complete-guide-real-estate-crm-selection"
  },
  {
    id: 4,
    title: "Mastering the Art of Real Estate Follow-ups",
    status: "scheduled",
    author: "David Kim",
    publishDate: "2024-01-20",
    category: "Sales Process",
    views: 0,
    slug: "mastering-real-estate-follow-ups"
  }
]

export default function BlogAdminPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredPosts = mockPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || post.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Blog Management</h1>
                <p className="text-gray-600">Manage your blog posts and content</p>
              </div>
              
              <Link href="/admin/blog/new">
                <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </Link>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search posts..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "published" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("published")}
                >
                  Published
                </Button>
                <Button
                  variant={statusFilter === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("draft")}
                >
                  Drafts
                </Button>
                <Button
                  variant={statusFilter === "scheduled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("scheduled")}
                >
                  Scheduled
                </Button>
              </div>
            </div>
          </header>

          <main className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Posts</p>
                      <p className="text-2xl font-bold text-slate-900">{mockPosts.length}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Edit className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Published</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {mockPosts.filter(p => p.status === 'published').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Drafts</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {mockPosts.filter(p => p.status === 'draft').length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Edit className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Views</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {mockPosts.reduce((total, post) => total + post.views, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-dealvize-teal/10 rounded-lg flex items-center justify-center">
                      <Eye className="h-4 w-4 text-dealvize-teal" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Posts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Blog Posts</CardTitle>
                <CardDescription>
                  {filteredPosts.length} of {mockPosts.length} posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {post.title}
                          </h3>
                          <Badge className={getStatusColor(post.status)}>
                            {post.status}
                          </Badge>
                          <Badge variant="outline">{post.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {post.author}
                          </div>
                          {post.publishDate && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(post.publishDate).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {post.views} views
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.status === 'published' && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/blog/${post.slug}`} target="_blank">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/blog/edit/${post.id}`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>View Analytics</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}

                  {filteredPosts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No posts found matching your criteria.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setSearchTerm("")
                          setStatusFilter("all")
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}