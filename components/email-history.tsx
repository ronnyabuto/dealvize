"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Clock, User, AlertCircle, Loader2, FileText } from "lucide-react"
import { useEmail } from "@/hooks/use-email"
import { formatDistanceToNow } from "date-fns"

interface EmailHistoryProps {
  clientId?: string
  showClientName?: boolean
}

interface EmailRecord {
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

export function EmailHistory({ clientId, showClientName = true }: EmailHistoryProps) {
  const [emailHistory, setEmailHistory] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { getEmailHistory, error } = useEmail()

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      const history = await getEmailHistory(clientId)
      setEmailHistory(history)
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

  const getClientName = (email: EmailRecord) => {
    if (!email.clients) return null
    
    if (email.clients.name) return email.clients.name
    
    if (email.clients.first_name && email.clients.last_name) {
      return `${email.clients.first_name} ${email.clients.last_name}`
    }
    
    return email.clients.first_name || email.clients.last_name || null
  }

  const truncateMessage = (message: string, maxLength: number = 150) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading email history...</span>
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
          <Mail className="h-5 w-5" />
          Email History
          {emailHistory.length > 0 && (
            <Badge variant="secondary">{emailHistory.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {emailHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No emails found</p>
            <p className="text-sm mt-2">Emails sent will appear here once you send them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emailHistory.map((email) => {
              const clientName = getClientName(email)
              
              return (
                <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="font-medium">{email.to_email}</span>
                        {showClientName && clientName && (
                          <>
                            <span className="text-gray-400 mx-2">•</span>
                            <div className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-600">{clientName}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(email.status)}>
                      {email.status}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium text-sm mb-2">
                      <strong>Subject:</strong> {email.subject}
                    </h4>
                    
                    {email.email_templates && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit mb-2">
                        <FileText className="h-3 w-3" />
                        <span>Template: {email.email_templates.name}</span>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-700 bg-gray-100 rounded p-3">
                      <div dangerouslySetInnerHTML={{ 
                        __html: truncateMessage(email.message_content).replace(/\n/g, '<br>') 
                      }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}</span>
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