import { MessagesContent } from "@/components/features/messaging/messages-content"
import { VideoMeetings } from "@/components/video-meetings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CommunicationPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Communication Hub</h2>
      </div>
      
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="meetings">Video Meetings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="space-y-4">
          <MessagesContent />
        </TabsContent>
        
        <TabsContent value="meetings" className="space-y-4">
          <VideoMeetings />
        </TabsContent>
      </Tabs>
    </div>
  )
}