'use client'

import { useState } from 'react'

interface SendEmailParams {
  to: string
  subject: string
  message: string
  clientId?: string
  templateId?: string
}

interface EmailHistory {
  id: string
  to_email: string
  subject: string
  message_content: string
  status: string
  created_at: string
  clients?: {
    id: string
    first_name?: string
    last_name?: string
    name?: string
    email?: string
  }
  email_templates?: {
    id: string
    name: string
  }
}

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body_text: string
  body_html?: string
  variables: string[]
  is_system: boolean
  usage_count: number
}

interface UseEmailReturn {
  sendEmail: (params: SendEmailParams) => Promise<boolean>
  getEmailHistory: (clientId?: string) => Promise<EmailHistory[]>
  getEmailTemplates: (category?: string) => Promise<EmailTemplate[]>
  processTemplate: (templateId: string, variables?: Record<string, any>, clientId?: string) => Promise<any>
  loading: boolean
  error: string | null
}

export function useEmail(): UseEmailReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendEmail = async ({ to, subject, message, clientId, templateId }: SendEmailParams): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to,
          subject,
          message,
          clientId,
          templateId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      const data = await response.json()
      return data.success

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
      return false
    } finally {
      setLoading(false)
    }
  }

  const getEmailHistory = async (clientId?: string): Promise<EmailHistory[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (clientId) params.set('clientId', clientId)

      const response = await fetch(`/api/email/history?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch email history')
      }

      const data = await response.json()
      return data.emailHistory || []

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email history')
      return []
    } finally {
      setLoading(false)
    }
  }

  const getEmailTemplates = async (category?: string): Promise<EmailTemplate[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)

      const response = await fetch(`/api/email-templates?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch email templates')
      }

      const data = await response.json()
      return data.templates || []

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email templates')
      return []
    } finally {
      setLoading(false)
    }
  }

  const processTemplate = async (templateId: string, variables?: Record<string, any>, clientId?: string): Promise<any> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/email-templates/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          template_id: templateId,
          variables: variables || {},
          client_id: clientId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process template')
      }

      return await response.json()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process template')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    sendEmail,
    getEmailHistory,
    getEmailTemplates,
    processTemplate,
    loading,
    error
  }
}