import { NurturingSequences } from "@/components/features/automation/nurturing-sequences"
import { ROIAnalytics } from "@/components/features/analytics/roi-analytics"
import { SMSAutomation } from "@/components/features/messaging/sms-automation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AutomationPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Marketing Automation</h2>
      </div>
      
      <Tabs defaultValue="nurturing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="nurturing">Email Nurturing</TabsTrigger>
          <TabsTrigger value="sms">SMS Automation</TabsTrigger>
          <TabsTrigger value="roi">ROI Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nurturing" className="space-y-4">
          <NurturingSequences />
        </TabsContent>
        
        <TabsContent value="sms" className="space-y-4">
          <SMSAutomation />
        </TabsContent>
        
        <TabsContent value="roi" className="space-y-4">
          <ROIAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}