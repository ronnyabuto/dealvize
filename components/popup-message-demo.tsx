"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePopupNotifications } from "@/contexts/popup-message-context"
import { 
  Info, AlertTriangle, CheckCircle, AlertCircle, 
  Megaphone, Zap, Gift, Star, RefreshCw 
} from "lucide-react"

export function PopupMessageDemo() {
  const popup = usePopupNotifications()

  const demoMessages = [
    {
      type: 'info' as const,
      title: 'System Update',
      message: 'New features have been added to your dashboard. Check them out!',
      action: { label: 'View Updates', url: '/updates' }
    },
    {
      type: 'success' as const,
      title: 'Deal Closed! 🎉',
      message: 'Congratulations! Your deal with John Smith has been successfully closed.',
      autoHide: true
    },
    {
      type: 'warning' as const,
      title: 'Task Overdue',
      message: 'You have 3 overdue tasks that need your attention.',
      action: { label: 'View Tasks', url: '/tasks' }
    },
    {
      type: 'error' as const,
      title: 'Sync Failed',
      message: 'Failed to sync data with your email provider. Please check your connection.',
      action: { label: 'Retry Sync', onClick: () => console.log('Retrying sync...') }
    },
    {
      type: 'announcement' as const,
      title: 'New Feature Release 🚀',
      message: 'AI-powered lead scoring is now available for all Pro users. Upgrade your workflow today!',
      priority: 'high' as const,
      action: { label: 'Learn More', url: '/ai-lead-scoring' }
    },
    {
      type: 'feature' as const,
      title: 'Smart Automation Available',
      message: 'Set up automated follow-up sequences to never miss a lead again.',
      action: { label: 'Set Up Now', url: '/automation' }
    },
    {
      type: 'promotion' as const,
      title: 'Limited Offer: 50% Off Premium! 🔥',
      message: 'Unlock advanced features, unlimited contacts, and priority support.',
      priority: 'urgent' as const,
      action: { label: 'Upgrade Now', url: '/pricing' }
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Popup Message Demo
        </CardTitle>
        <CardDescription>
          Test different types of popup messages that appear at the bottom right of your screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {demoMessages.map((msg, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left"
              onClick={() => {
                popup.addMessage({
                  type: msg.type,
                  title: msg.title,
                  message: msg.message,
                  priority: msg.priority || 'medium',
                  action: msg.action,
                  autoHide: msg.autoHide,
                  autoHideDelay: msg.autoHide ? 5000 : undefined,
                  dismissible: true
                })
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {msg.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                {msg.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {msg.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {msg.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                {msg.type === 'announcement' && <Megaphone className="h-4 w-4 text-purple-500" />}
                {msg.type === 'feature' && <Zap className="h-4 w-4 text-indigo-500" />}
                {msg.type === 'promotion' && <Gift className="h-4 w-4 text-pink-500" />}
                <Badge variant="outline" className="text-xs capitalize">
                  {msg.type}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">{msg.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {msg.message}
                </p>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              popup.showSuccess(
                'Test Successful!',
                'This is a quick success message that will auto-hide in 5 seconds.'
              )
            }}
          >
            Quick Success
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              popup.showError(
                'Connection Error',
                'Failed to connect to the server. Please check your internet connection and try again.'
              )
            }}
          >
            Quick Error
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              popup.announceFeature(
                'New Dashboard Widget',
                'We\'ve added a new analytics widget to help you track your performance better.',
                '/analytics'
              )
            }}
          >
            Feature Announcement
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              popup.showPromotion(
                'Flash Sale: 24 Hours Only! ⚡',
                'Get 40% off all premium plans. Limited time offer ending soon!',
                'Claim Discount',
                '/pricing?promo=flash40'
              )
            }}
          >
            Flash Promotion
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => popup.clearAllMessages()}
          >
            Clear All
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Popup Features:</p>
          <ul className="space-y-1">
            <li>• <strong>Persistent:</strong> Messages stay visible across page navigation</li>
            <li>• <strong>Smart Dismissal:</strong> Remembers dismissed messages via localStorage</li>
            <li>• <strong>Auto-hide:</strong> Success messages automatically disappear after 5 seconds</li>
            <li>• <strong>Priority System:</strong> Urgent messages show with pulsing animation</li>
            <li>• <strong>Action Buttons:</strong> Can include CTA buttons with custom actions or URLs</li>
            <li>• <strong>Page Targeting:</strong> Show messages only on specific pages</li>
            <li>• <strong>View Limits:</strong> Limit how many times a user sees each message</li>
            <li>• <strong>Date Ranges:</strong> Schedule messages to show between specific dates</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}