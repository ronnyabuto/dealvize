import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { z } from 'zod'

const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'scheduled']),
  slug: z.string().min(1, 'Slug is required'),
  metaTitle: z.string().max(60, 'Meta title too long').optional(),
  metaDescription: z.string().max(160, 'Meta description too long').optional(),
  publishDate: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Build query
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
    }

    // Transform posts for response
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      status: post.status,
      slug: post.slug,
      author: post.author_name || 'Admin',
      publishDate: post.publish_date || post.created_at,
      views: post.views || 0,
      metaTitle: post.meta_title,
      metaDescription: post.meta_description,
      createdAt: post.created_at,
      updatedAt: post.updated_at
    })) || []

    return NextResponse.json({ posts: transformedPosts })
  } catch (error) {
    console.error('Error in GET /api/blog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = blogPostSchema.parse(body)

    // Get user profile for author info
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    }

    // Prepare blog post data
    const blogPostData = {
      title: validatedData.title,
      content: validatedData.content,
      excerpt: validatedData.excerpt || validatedData.content.substring(0, 200) + '...',
      category: validatedData.category,
      status: validatedData.status,
      slug: validatedData.slug,
      meta_title: validatedData.metaTitle || validatedData.title,
      meta_description: validatedData.metaDescription || validatedData.excerpt,
      author_id: user.id,
      author_name: userProfile?.full_name || userProfile?.email || 'Admin',
      publish_date: validatedData.status === 'published' ? new Date().toISOString() : validatedData.publishDate,
      views: 0
    }

    // Check if slug already exists
    const { data: existingPost, error: slugError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', validatedData.slug)
      .single()

    if (existingPost) {
      return NextResponse.json({ 
        error: 'A post with this slug already exists. Please modify the title.' 
      }, { status: 400 })
    }

    // Insert blog post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert(blogPostData)
      .select()
      .single()

    if (error) {
      console.error('Error creating blog post:', error)
      return NextResponse.json({ 
        error: 'Failed to create blog post', 
        details: error.message 
      }, { status: 500 })
    }

    // Log activity
    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          user_email: user.email,
          action: validatedData.status === 'published' ? 'published' : 'created',
          resource_type: 'blog_post',
          resource_id: post.id,
          details: `${validatedData.status === 'published' ? 'Published' : 'Created'} blog post: ${validatedData.title}`,
          timestamp: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Error logging activity:', logError)
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      message: `Blog post ${validatedData.status === 'published' ? 'published' : 'created'} successfully`,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/blog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}