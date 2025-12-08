"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Send, Loader2, CheckCircle, AlertCircle, FileText, Sparkles } from "lucide-react"
import { useEmail } from "@/hooks/use-email"

interface EmailDialogProps {
  trigger?: React.ReactNode
  clientId?: string
  clientName?: string
  clientEmail?: string
}

export function EmailDialog({ trigger, clientId, clientName, clientEmail }: EmailDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(clientEmail || '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templates, setTemplates] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('compose')
  
  const { sendEmail, getEmailTemplates, processTemplate, loading, error } = useEmail()

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    const templateList = await getEmailTemplates()
    setTemplates(templateList)
  }

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) return
    
    setSelectedTemplate(templateId)
    const result = await processTemplate(templateId, {}, clientId)
    
    if (result?.processed_template) {
      setSubject(result.processed_template.subject)
      setMessage(result.processed_template.body_text)
      setActiveTab('compose')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !subject.trim() || !message.trim()) {
      return
    }

    const success = await sendEmail({
      to: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      clientId,
      templateId: selectedTemplate || undefined
    })

    if (success) {
      setSuccess(true)
      setSubject('')
      setMessage('')
      setSelectedTemplate('')
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email {clientName && `to ${clientName}`}
          </DialogTitle>
        </DialogHeader>
        
        {success ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Email Sent!</h3>
              <p className="text-sm text-green-700">Your email has been delivered successfully.</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">
                <Mail className="h-4 w-4 mr-2" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div>
                <Label>Choose Email Template</Label>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No email templates found</p>
                    <p className="text-sm mt-2">Create templates to speed up your email composition.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {templates.map((template) => (
                      <div 
                        key={template.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                              {template.category}
                            </span>
                            {template.is_system && (
                              <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-600 ml-2">
                                System
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTemplateSelect(template.id)
                            }}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Subject:</strong> {template.subject}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {template.body_text}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Used {template.usage_count} times
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="compose">
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <Label htmlFor="emailAddress">To</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    required
                  />
                  {email && !validateEmail(email) && (
                    <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    required
                  />
                </div>

                {selectedTemplate && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    <FileText className="h-4 w-4" />
                    <span>Using template</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate('')
                        setSubject('')
                        setMessage('')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={8}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !email.trim() || !subject.trim() || !message.trim() || !validateEmail(email)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}