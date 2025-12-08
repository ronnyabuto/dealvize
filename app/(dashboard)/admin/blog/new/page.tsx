'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Eye, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'

const categories = [
  "Lead Generation",
  "Client Relations", 
  "Technology",
  "Sales Process",
  "Market Analysis",
  "CRM Tips",
  "Industry News"
]

interface BlogPost {
  title: string
  content: string
  excerpt: string
  category: string
  status: 'draft' | 'published' | 'scheduled'
  publishDate?: string
  metaTitle: string
  metaDescription: string
}

export default function NewBlogPostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [post, setPost] = useState<BlogPost>({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    status: 'draft',
    metaTitle: '',
    metaDescription: ''
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!post.title || !post.content || !post.category) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const slug = generateSlug(post.title)
      const postData = {
        ...post,
        status,
        slug,
        excerpt: post.excerpt || post.content.substring(0, 200) + '...',
        metaTitle: post.metaTitle || post.title,
        metaDescription: post.metaDescription || post.excerpt || post.content.substring(0, 160)
      }

      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(`Blog post ${status === 'published' ? 'published' : 'saved as draft'} successfully!`)
        
        // Redirect to blog admin after 2 seconds
        setTimeout(() => {
          router.push('/admin/blog')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save blog post')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    // In a real app, this would open a preview modal or new tab
    alert('Preview functionality would show the post preview here')
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/blog">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Blog
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">New Blog Post</h1>
                  <p className="text-gray-600">Create and publish a new blog post</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit('draft')}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  onClick={() => handleSubmit('published')}
                  disabled={loading}
                  className="bg-dealvize-teal hover:bg-dealvize-teal-dark"
                >
                  Publish
                </Button>
              </div>
            </div>
          </header>

          <main className="p-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Post Content</CardTitle>
                    <CardDescription>Write your blog post content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter post title..."
                        value={post.title}
                        onChange={(e) => setPost({...post, title: e.target.value})}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Textarea
                        id="excerpt"
                        placeholder="Brief description of the post (optional)..."
                        value={post.excerpt}
                        onChange={(e) => setPost({...post, excerpt: e.target.value})}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        placeholder="Write your blog post content here..."
                        value={post.content}
                        onChange={(e) => setPost({...post, content: e.target.value})}
                        rows={15}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {post.content.length} characters
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* SEO Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>SEO Settings</CardTitle>
                    <CardDescription>Optimize your post for search engines</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <Input
                        id="metaTitle"
                        placeholder="SEO title (defaults to post title)"
                        value={post.metaTitle}
                        onChange={(e) => setPost({...post, metaTitle: e.target.value})}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(post.metaTitle || post.title).length}/60 characters
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="metaDescription">Meta Description</Label>
                      <Textarea
                        id="metaDescription"
                        placeholder="SEO description (defaults to excerpt)"
                        value={post.metaDescription}
                        onChange={(e) => setPost({...post, metaDescription: e.target.value})}
                        rows={3}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {(post.metaDescription || post.excerpt).length}/160 characters
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Post Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={post.category} onValueChange={(value) => setPost({...post, category: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <div className="mt-2">
                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>

                    {post.title && (
                      <div>
                        <Label>URL Slug</Label>
                        <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                          /blog/{generateSlug(post.title)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Publishing Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Write compelling titles that include relevant keywords</li>
                      <li>• Keep excerpts under 200 characters</li>
                      <li>• Use clear, engaging content with proper headings</li>
                      <li>• Optimize meta descriptions for search engines</li>
                      <li>• Choose the most relevant category for your post</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}