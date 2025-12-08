'use client'

import { useState } from 'react'

interface SendSmsParams {
  to: string
  message: string
  clientId?: string
}

interface SmsHistory {
  id: string
  to_number: string
  message_content: string
  status: string
  created_at: string
  clients?: {
    id: string
    first_name?: string
    last_name?: string
    name?: string
  }
}

interface UseSmsReturn {
  sendSms: (params: SendSmsParams) => Promise<boolean>
  getSmsHistory: (clientId?: string) => Promise<SmsHistory[]>
  loading: boolean
  error: string | null
}

export function useSms(): UseSmsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendSms = async ({ to, message, clientId }: SendSmsParams): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to,
          message,
          clientId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send SMS')
      }

      const data = await response.json()
      return data.success

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS')
      return false
    } finally {
      setLoading(false)
    }
  }

  const getSmsHistory = async (clientId?: string): Promise<SmsHistory[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (clientId) params.set('clientId', clientId)

      const response = await fetch(`/api/sms/history?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch SMS history')
      }

      const data = await response.json()
      return data.smsHistory || []

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SMS history')
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    sendSms,
    getSmsHistory,
    loading,
    error
  }
}