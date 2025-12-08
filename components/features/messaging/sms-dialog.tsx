"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Send, Loader2, CheckCircle, AlertCircle, Phone } from "lucide-react"
import { useSms } from "@/hooks/use-sms"

interface SmsDialogProps {
  trigger?: React.ReactNode
  clientId?: string
  clientName?: string
  clientPhone?: string
}

export function SmsDialog({ trigger, clientId, clientName, clientPhone }: SmsDialogProps) {
  const [open, setOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(clientPhone || '')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { sendSms, loading, error } = useSms()

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber.trim() || !message.trim()) {
      return
    }

    const success = await sendSms({
      to: phoneNumber.trim(),
      message: message.trim(),
      clientId
    })

    if (success) {
      setSuccess(true)
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const getCharacterCount = (text: string) => {
    const count = text.length
    const smsLimit = 160
    return {
      count,
      color: count > smsLimit ? 'text-red-600' : count > smsLimit * 0.8 ? 'text-yellow-600' : 'text-gray-500',
      segments: Math.ceil(count / smsLimit)
    }
  }

  const charInfo = getCharacterCount(message)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Send SMS {clientName && `to ${clientName}`}
          </DialogTitle>
        </DialogHeader>
        
        {success ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Message Sent!</h3>
              <p className="text-sm text-green-700">Your SMS has been delivered successfully.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14}
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                maxLength={320}
                required
              />
              <div className={`text-xs mt-1 ${charInfo.color}`}>
                {charInfo.count}/320 characters
                {charInfo.segments > 1 && ` (${charInfo.segments} SMS messages)`}
              </div>
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
                disabled={loading || !phoneNumber.trim() || !message.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}