/**
 * Admin Email Template Management API
 * ConvertKit-style template management with system-wide templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const EmailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['welcome', 'nurturing', 'promotional', 'transactional', 'general']).default('general'),
  subject: z.string().min(1, 'Subject line is required'),
  body_text: z.string().min(1, 'Email body is required'),
  body_html: z.string().optional(),
  variables: z.array(z.string()).default([]),
  is_system: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  preview_text: z.string().optional(),
  design_settings: z.object({
    font_family: z.string().optional(),
    font_size: z.number().optional(),
    colors: z.object({
      primary: z.string().optional(),
      text: z.string().optional(),
      background: z.string().optional()
    }).optional(),
    layout: z.enum(['simple', 'newsletter', 'promotional']).default('simple')
  }).optional()
})

// GET - List email templates with admin features
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const category = searchParams.get('category')
    const is_system = searchParams.get('is_system')
    const search = searchParams.get('search')
    const user_id = searchParams.get('user_id')
    const offset = (page - 1) * limit

    try {
      let query = supabase
        .from('email_templates')
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email
          ),
          usage_stats:email_logs(
            template_id,
            status,
            created_at
          )
        `)
        .eq('is_active', true)

      // Apply filters
      if (category) query = query.eq('category', category)
      if (is_system === 'true') query = query.eq('is_system', true)
      if (is_system === 'false') query = query.eq('is_system', false)
      if (user_id) query = query.eq('user_id', user_id)
      
      if (search) {
        query = query.or(`
          name.ilike.%${search}%,
          subject.ilike.%${search}%,
          body_text.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('email_templates')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get paginated results
      const { data: templates, error } = await query
        .order('is_system', { ascending: false })
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate usage statistics for each template
      const templatesWithStats = (templates || []).map(template => {
        const usageStats = template.usage_stats || []
        const totalUses = usageStats.length
        const successfulUses = usageStats.filter(u => u.status === 'sent').length
        const recentUses = usageStats.filter(u => {
          const useDate = new Date(u.created_at)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return useDate > sevenDaysAgo
        }).length

        return {
          ...template,
          usage_analytics: {
            total_uses: totalUses,
            successful_uses: successfulUses,
            success_rate: totalUses > 0 ? Math.round((successfulUses / totalUses) * 100) : 0,
            recent_uses_7d: recentUses
          }
        }
      })

      // Calculate summary statistics
      const summary = {
        total_templates: count || 0,
        system_templates: templatesWithStats.filter(t => t.is_system).length,
        user_templates: templatesWithStats.filter(t => !t.is_system).length,
        categories: {
          welcome: templatesWithStats.filter(t => t.category === 'welcome').length,
          nurturing: templatesWithStats.filter(t => t.category === 'nurturing').length,
          promotional: templatesWithStats.filter(t => t.category === 'promotional').length,
          transactional: templatesWithStats.filter(t => t.category === 'transactional').length,
          general: templatesWithStats.filter(t => t.category === 'general').length
        },
        most_used: templatesWithStats
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            name: t.name,
            usage_count: t.usage_count,
            category: t.category
          }))
      }

      return NextResponse.json({
        templates: templatesWithStats,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching email templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email templates' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create system email template
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const validatedData = EmailTemplateSchema.parse(body)

      // Check for duplicate names among system templates
      if (validatedData.is_system) {
        const { data: existing } = await serviceClient
          .from('email_templates')
          .select('id')
          .eq('is_system', true)
          .eq('name', validatedData.name)
          .single()

        if (existing) {
          return NextResponse.json({
            error: 'A system template with this name already exists'
          }, { status: 400 })
        }
      }

      // Extract variables from template content
      const extractedVariables = extractVariablesFromTemplate(
        validatedData.subject + ' ' + validatedData.body_text
      )

      // Generate HTML version if not provided
      let htmlBody = validatedData.body_html
      if (!htmlBody) {
        htmlBody = generateHtmlFromText(
          validatedData.body_text,
          validatedData.design_settings
        )
      }

      const templateData = {
        user_id: validatedData.is_system ? null : context.userId,
        name: validatedData.name,
        category: validatedData.category,
        subject: validatedData.subject,
        body_text: validatedData.body_text,
        body_html: htmlBody,
        variables: [...new Set([...validatedData.variables, ...extractedVariables])], // Merge and dedupe
        is_system: validatedData.is_system,
        tags: validatedData.tags,
        preview_text: validatedData.preview_text,
        design_settings: validatedData.design_settings
      }

      const { data: template, error } = await serviceClient
        .from('email_templates')
        .insert(templateData)
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'email_template.created',
          entity_type: 'email_template',
          entity_id: template.id,
          metadata: {
            template_name: validatedData.name,
            category: validatedData.category,
            is_system: validatedData.is_system,
            created_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Email template created successfully',
        template
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

      console.error('Error creating email template:', error)
      return NextResponse.json(
        { error: 'Failed to create email template' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

// PUT - Update email template
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    try {
      const body = await request.json()
      const validatedData = EmailTemplateSchema.partial().parse(body)

      // Extract variables if content was updated
      let extractedVariables: string[] = []
      if (validatedData.subject || validatedData.body_text) {
        const content = (validatedData.subject || '') + ' ' + (validatedData.body_text || '')
        extractedVariables = extractVariablesFromTemplate(content)
      }

      const updateData: any = { updated_at: new Date().toISOString() }

      if (validatedData.name) updateData.name = validatedData.name
      if (validatedData.category) updateData.category = validatedData.category
      if (validatedData.subject) updateData.subject = validatedData.subject
      if (validatedData.body_text) updateData.body_text = validatedData.body_text
      if (validatedData.body_html !== undefined) updateData.body_html = validatedData.body_html
      if (validatedData.preview_text !== undefined) updateData.preview_text = validatedData.preview_text
      if (validatedData.design_settings) updateData.design_settings = validatedData.design_settings
      if (validatedData.tags) updateData.tags = validatedData.tags

      // Merge variables if content was updated
      if (extractedVariables.length > 0) {
        const existingVariables = validatedData.variables || []
        updateData.variables = [...new Set([...existingVariables, ...extractedVariables])]
      } else if (validatedData.variables) {
        updateData.variables = validatedData.variables
      }

      // Generate HTML if text was updated but HTML wasn't provided
      if (validatedData.body_text && !validatedData.body_html) {
        updateData.body_html = generateHtmlFromText(
          validatedData.body_text,
          validatedData.design_settings
        )
      }

      const { data: template, error } = await serviceClient
        .from('email_templates')
        .update(updateData)
        .eq('id', templateId)
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'email_template.updated',
          entity_type: 'email_template',
          entity_id: templateId,
          metadata: {
            template_name: template.name,
            changes: Object.keys(updateData),
            updated_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Email template updated successfully',
        template
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

      console.error('Error updating email template:', error)
      return NextResponse.json(
        { error: 'Failed to update email template' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

// Helper functions
function extractVariablesFromTemplate(content: string): string[] {
  const variableRegex = /\{\{\s*(\w+)\s*\}\}/g
  const variables: string[] = []
  let match

  while ((match = variableRegex.exec(content)) !== null) {
    variables.push(match[1])
  }

  return [...new Set(variables)] // Remove duplicates
}

function generateHtmlFromText(text: string, designSettings?: any): string {
  const settings = designSettings || {}
  const colors = settings.colors || {}
  
  const styles = `
    font-family: ${settings.font_family || 'Arial, sans-serif'};
    font-size: ${settings.font_size || 16}px;
    color: ${colors.text || '#333333'};
    background-color: ${colors.background || '#ffffff'};
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `

  const htmlContent = text
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Email Template</title>
    </head>
    <body style="${styles}">
      ${htmlContent}
    </body>
    </html>
  `
}