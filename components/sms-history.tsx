"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Clock, Phone, User, AlertCircle, Loader2 } from "lucide-react"
import { useSms } from "@/hooks/use-sms"
import { formatDistanceToNow } from "date-fns"

interface SmsHistoryProps {
  clientId?: string
  showClientName?: boolean
}

interface SmsRecord {
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

export function SmsHistory({ clientId, showClientName = true }: SmsHistoryProps) {
  const [smsHistory, setSmsHistory] = useState<SmsRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { getSmsHistory, error } = useSms()

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      const history = await getSmsHistory(clientId)
      setSmsHistory(history)
      setLoading(false)
    }
    
    fetchHistory()
  }, [clientId])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getClientName = (sms: SmsRecord) => {
    if (!sms.clients) return null
    
    if (sms.clients.name) return sms.clients.name
    
    if (sms.clients.first_name && sms.clients.last_name) {
      return `${sms.clients.first_name} ${sms.clients.last_name}`
    }
    
    return sms.clients.first_name || sms.clients.last_name || null
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove +1 country code for display
    const cleaned = phone.replace(/^\+1/, '')
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    
    return phone
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading SMS history...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS History
          {smsHistory.length > 0 && (
            <Badge variant="secondary">{smsHistory.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {smsHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No SMS messages found</p>
            <p className="text-sm mt-2">SMS messages will appear here once you send them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {smsHistory.map((sms) => {
              const clientName = getClientName(sms)
              
              return (
                <div key={sms.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{formatPhoneNumber(sms.to_number)}</span>
                      {showClientName && clientName && (
                        <>
                          <span className="text-gray-400">•</span>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-600">{clientName}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <Badge className={getStatusColor(sms.status)}>
                      {sms.status}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 bg-gray-100 rounded p-3">
                      {sms.message_content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(sms.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}