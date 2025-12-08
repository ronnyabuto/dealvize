/**
 * Admin Blog CMS API
 * Complete blog management system for super-admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const BlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured_image: z.string().url().optional(),
  meta_title: z.string().max(60, 'Meta title too long').optional(),
  meta_description: z.string().max(160, 'Meta description too long').optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  published_at: z.string().datetime().optional(),
  featured: z.boolean().default(false),
  allow_comments: z.boolean().default(true),
  seo_settings: z.object({
    canonical_url: z.string().url().optional(),
    robots: z.enum(['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow']).default('index,follow'),
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    og_image: z.string().url().optional(),
    twitter_card: z.enum(['summary', 'summary_large_image', 'app', 'player']).default('summary_large_image')
  }).optional()
})

const BlogCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  parent_id: z.string().optional()
})

// GET - List blog posts with filtering and analytics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type') || 'posts' // 'posts', 'categories', 'analytics'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const offset = (page - 1) * limit

    try {
      if (type === 'categories') {
        return await getBlogCategories(serviceClient)
      } else if (type === 'analytics') {
        return await getBlogAnalytics(serviceClient, searchParams)
      }

      // Get blog posts
      let query = serviceClient
        .from('blog_posts')
        .select(`
          *,
          author:profiles(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          categories:blog_post_categories(
            category:blog_categories(
              id,
              name,
              slug,
              color
            )
          ),
          view_stats:blog_post_views(count),
          comment_count:blog_comments(count)
        `)

      // Apply filters
      if (status) query = query.eq('status', status)
      if (category) {
        query = query.contains('categories', [{ slug: category }])
      }
      if (tag) {
        query = query.contains('tags', [tag])
      }
      if (featured === 'true') query = query.eq('featured', true)
      if (search) {
        query = query.or(`
          title.ilike.%${search}%,
          excerpt.ilike.%${search}%,
          content.ilike.%${search}%
        `)
      }

      // Get total count
      const { count } = await serviceClient
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })

      // Get paginated results
      const { data: posts, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate analytics for each post
      const postsWithAnalytics = (posts || []).map(post => ({
        ...post,
        view_count: post.view_stats?.[0]?.count || 0,
        comment_count: post.comment_count?.[0]?.count || 0,
        read_time: calculateReadTime(post.content),
        word_count: countWords(post.content)
      }))

      // Get summary statistics
      const summary = await getBlogSummary(serviceClient)

      return NextResponse.json({
        posts: postsWithAnalytics,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching blog data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blog data' },
        { status: 500 }
      )
    }
  }, {
    resource: 'blog',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create blog post or category
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'post'

    try {
      const body = await request.json()

      if (type === 'category') {
        const validatedData = BlogCategorySchema.parse(body)
        
        // Check for duplicate slug
        const { data: existing } = await serviceClient
          .from('blog_categories')
          .select('id')
          .eq('slug', validatedData.slug)
          .single()

        if (existing) {
          return NextResponse.json({
            error: 'A category with this slug already exists'
          }, { status: 400 })
        }

        const { data: category, error } = await serviceClient
          .from('blog_categories')
          .insert({
            ...validatedData,
            created_by: context.userId
          })
          .select()
          .single()

        if (error) throw error

        await logBlogActivity(serviceClient, context.userId, 'blog_category.created', 'blog_category', category.id, {
          category_name: validatedData.name,
          slug: validatedData.slug
        })

        return NextResponse.json({
          message: 'Blog category created successfully',
          category
        }, { status: 201 })
      }

      // Create blog post
      const validatedData = BlogPostSchema.parse(body)

      // Check for duplicate slug
      const { data: existing } = await serviceClient
        .from('blog_posts')
        .select('id')
        .eq('slug', validatedData.slug)
        .single()

      if (existing) {
        return NextResponse.json({
          error: 'A blog post with this slug already exists'
        }, { status: 400 })
      }

      // Set published_at if status is published
      let publishedAt = validatedData.published_at
      if (validatedData.status === 'published' && !publishedAt) {
        publishedAt = new Date().toISOString()
      }

      const postData = {
        ...validatedData,
        author_id: context.userId,
        published_at: publishedAt,
        read_time: calculateReadTime(validatedData.content),
        word_count: countWords(validatedData.content)
      }

      const { data: post, error } = await serviceClient
        .from('blog_posts')
        .insert(postData)
        .select(`
          *,
          author:profiles(
            first_name,
            last_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Handle categories
      if (validatedData.categories.length > 0) {
        const categoryRelations = validatedData.categories.map(categorySlug => ({
          post_id: post.id,
          category_id: categorySlug // This should be category ID, not slug in production
        }))

        await serviceClient
          .from('blog_post_categories')
          .insert(categoryRelations)
      }

      await logBlogActivity(serviceClient, context.userId, 'blog_post.created', 'blog_post', post.id, {
        title: validatedData.title,
        status: validatedData.status,
        slug: validatedData.slug
      })

      return NextResponse.json({
        message: 'Blog post created successfully',
        post
      }, { status: 201 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error creating blog content:', error)
      return NextResponse.json(
        { error: 'Failed to create blog content' },
        { status: 500 }
      )
    }
  }, {
    resource: 'blog',
    action: 'manage',
    requireTenant: false
  })
}

// PUT - Update blog post or category
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'post'

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    try {
      const body = await request.json()

      if (type === 'category') {
        const validatedData = BlogCategorySchema.partial().parse(body)
        
        const { data: category, error } = await serviceClient
          .from('blog_categories')
          .update({
            ...validatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return NextResponse.json({
          message: 'Category updated successfully',
          category
        })
      }

      // Update blog post
      const validatedData = BlogPostSchema.partial().parse(body)

      // Update calculated fields if content changed
      const updateData: any = {
        ...validatedData,
        updated_at: new Date().toISOString()
      }

      if (validatedData.content) {
        updateData.read_time = calculateReadTime(validatedData.content)
        updateData.word_count = countWords(validatedData.content)
      }

      // Set published_at if status changed to published
      if (validatedData.status === 'published' && !validatedData.published_at) {
        updateData.published_at = new Date().toISOString()
      }

      const { data: post, error } = await serviceClient
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          author:profiles(
            first_name,
            last_name,
            email
          )
        `)
        .single()

      if (error) throw error

      await logBlogActivity(serviceClient, context.userId, 'blog_post.updated', 'blog_post', id, {
        title: post.title,
        changes: Object.keys(updateData)
      })

      return NextResponse.json({
        message: 'Blog post updated successfully',
        post
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error updating blog content:', error)
      return NextResponse.json(
        { error: 'Failed to update blog content' },
        { status: 500 }
      )
    }
  }, {
    resource: 'blog',
    action: 'manage',
    requireTenant: false
  })
}

// DELETE - Delete blog post or category
export async function DELETE(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'post'

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    try {
      if (type === 'category') {
        // Check if category is in use
        const { data: usage } = await serviceClient
          .from('blog_post_categories')
          .select('id')
          .eq('category_id', id)
          .limit(1)

        if (usage && usage.length > 0) {
          return NextResponse.json({
            error: 'Cannot delete category that is in use'
          }, { status: 400 })
        }

        const { error } = await serviceClient
          .from('blog_categories')
          .delete()
          .eq('id', id)

        if (error) throw error

        return NextResponse.json({
          message: 'Category deleted successfully'
        })
      }

      // Delete blog post
      const { data: post } = await serviceClient
        .from('blog_posts')
        .select('title')
        .eq('id', id)
        .single()

      const { error } = await serviceClient
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logBlogActivity(serviceClient, context.userId, 'blog_post.deleted', 'blog_post', id, {
        title: post?.title || 'Unknown'
      })

      return NextResponse.json({
        message: 'Blog post deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting blog content:', error)
      return NextResponse.json(
        { error: 'Failed to delete blog content' },
        { status: 500 }
      )
    }
  }, {
    resource: 'blog',
    action: 'manage',
    requireTenant: false
  })
}

// Helper functions
async function getBlogCategories(serviceClient: any) {
  const { data: categories, error } = await serviceClient
    .from('blog_categories')
    .select(`
      *,
      post_count:blog_post_categories(count),
      creator:profiles(first_name, last_name)
    `)
    .order('name')

  if (error) throw error

  const categoriesWithCounts = categories.map(cat => ({
    ...cat,
    post_count: cat.post_count?.[0]?.count || 0
  }))

  return NextResponse.json({
    categories: categoriesWithCounts
  })
}

async function getBlogAnalytics(serviceClient: any, searchParams: URLSearchParams) {
  const timeRange = searchParams.get('range') || '30d'
  
  const now = new Date()
  let startDate = new Date()

  switch (timeRange) {
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
    default:
      startDate.setDate(now.getDate() - 30)
  }

  // Get basic metrics
  const [
    { count: totalPosts },
    { count: publishedPosts },
    { count: draftPosts },
    { data: views },
    { data: topPosts }
  ] = await Promise.all([
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }),
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    serviceClient.from('blog_post_views').select('*').gte('viewed_at', startDate.toISOString()),
    serviceClient.from('blog_posts')
      .select(`
        id, title, slug, view_count, created_at,
        author:profiles(first_name, last_name)
      `)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10)
  ])

  const totalViews = views?.length || 0

  return NextResponse.json({
    overview: {
      total_posts: totalPosts || 0,
      published_posts: publishedPosts || 0,
      draft_posts: draftPosts || 0,
      total_views: totalViews,
      views_this_period: totalViews
    },
    top_posts: topPosts || [],
    time_range: timeRange
  })
}

async function getBlogSummary(serviceClient: any) {
  const [
    { count: totalPosts },
    { count: publishedPosts },
    { count: draftPosts },
    { count: totalCategories }
  ] = await Promise.all([
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }),
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    serviceClient.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    serviceClient.from('blog_categories').select('*', { count: 'exact', head: true })
  ])

  return {
    total_posts: totalPosts || 0,
    published_posts: publishedPosts || 0,
    draft_posts: draftPosts || 0,
    total_categories: totalCategories || 0
  }
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = countWords(content)
  return Math.ceil(wordCount / wordsPerMinute)
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).length
}

async function logBlogActivity(serviceClient: any, userId: string, action: string, entityType: string, entityId: string, metadata: any) {
  await serviceClient
    .from('tenant_activity_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        ...metadata,
        created_by: 'admin'
      }
    })
}