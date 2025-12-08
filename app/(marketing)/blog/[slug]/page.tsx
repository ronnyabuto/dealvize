import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, Share2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlogPostClient, ShareButton } from './blog-post-client'

// Helper function to calculate read time
function calculateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

// Fetch blog post from database (server-side)
async function getBlogPost(slug: string) {
  try {
    const supabase = await createClient()
    
    // Fetch blog post by slug
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !post) {
      return null
    }

    // Increment view count
    await supabase
      .from('blog_posts')
      .update({ views: (post.views || 0) + 1 })
      .eq('id', post.id)

    // Transform post for response
    return {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      status: post.status,
      slug: post.slug,
      author: post.author_name || 'Admin',
      date: post.publish_date || post.created_at,
      readTime: calculateReadTime(post.content),
      views: (post.views || 0) + 1,
      metaTitle: post.meta_title,
      metaDescription: post.meta_description,
      createdAt: post.created_at,
      updatedAt: post.updated_at
    }
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  
  if (!post) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.'
    }
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <BlogPostClient>

      {/* Blog Post Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back to Blog */}
        <Link href="/blog" className="inline-flex items-center text-dealvize-teal hover:text-dealvize-teal-dark mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <Badge variant="secondary" className="mb-4">
            {post.category}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              <span className="font-medium">{post.author}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <span>{new Date(post.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Share Button */}
          <div className="flex items-center gap-4 pb-8 border-b border-gray-200">
            <ShareButton />
          </div>
        </header>

        {/* Article Content */}
        <div 
          className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-dealvize-teal prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">About the Author</h3>
              <p className="text-gray-600">
                {post.author} is a real estate expert with over 10 years of experience helping agents grow their businesses.
              </p>
            </div>
            <ShareButton />
          </div>
        </footer>
      </article>

      {/* CTA Section */}
      <section className="py-20 bg-dealvize-teal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to implement these strategies?
          </h2>
          <p className="text-xl text-dealvize-teal-light mb-8">
            Dealvize CRM makes it easy to manage leads, track follow-ups, and close more deals.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="px-8">
              Start Your Free Trial
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
    </BlogPostClient>
  )
}