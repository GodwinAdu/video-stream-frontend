"use client"

import { useState, useEffect } from "react"
import { X, Lightbulb, ListChecks, Download, Share, Copy, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface MeetingInsightsPanelProps {
  onClose: () => void
  summary: string | null
  actionItems: string[]
  isLoading: boolean
  chatMessages?: any[]
  participants?: any[]
}

export default function MeetingInsightsPanel({ 
  onClose, 
  summary, 
  actionItems, 
  isLoading, 
  chatMessages = [], 
  participants = [] 
}: MeetingInsightsPanelProps) {
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(summary)
  const [generatedActionItems, setGeneratedActionItems] = useState<string[]>(actionItems)
  const [isGenerating, setIsGenerating] = useState(false)
  const [meetingStats, setMeetingStats] = useState({
    duration: '0:00',
    messageCount: 0,
    participantCount: 0,
    engagement: 'High'
  })

  useEffect(() => {
    setMeetingStats({
      duration: '25:30', // This would be calculated from meeting start time
      messageCount: chatMessages.length,
      participantCount: participants.length,
      engagement: participants.length > 2 ? 'High' : 'Medium'
    })
  }, [chatMessages, participants])

  const generateInsights = async () => {
    setIsGenerating(true)
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate mock insights based on meeting data
    const mockSummary = `Meeting focused on project planning and task allocation. Key decisions were made regarding timeline and resource allocation. Team discussed upcoming milestones and identified potential blockers. Overall productive session with clear next steps identified.`
    
    const mockActionItems = [
      'Complete user research by Friday',
      'Schedule follow-up meeting with stakeholders',
      'Review and update project timeline',
      'Prepare presentation for next week\'s demo'
    ]
    
    setGeneratedSummary(mockSummary)
    setGeneratedActionItems(mockActionItems)
    setIsGenerating(false)
    toast.success('Meeting insights generated successfully!')
  }

  const exportSummary = () => {
    const content = `Meeting Summary\n\n${generatedSummary}\n\nAction Items:\n${generatedActionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Summary exported successfully!')
  }

  const copyToClipboard = async () => {
    const content = `Meeting Summary\n\n${generatedSummary}\n\nAction Items:\n${generatedActionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    await navigator.clipboard.writeText(content)
    toast.success('Summary copied to clipboard!')
  }

  const shareInsights = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meeting Summary',
          text: `Meeting Summary\n\n${generatedSummary}\n\nAction Items:\n${generatedActionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      copyToClipboard()
    }
  }
  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-50 text-lg">Meeting Insights</h3>
            <p className="text-xs text-slate-400">AI-powered meeting analysis</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-9 w-9 p-0 text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 rounded-xl"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Enhanced Insights Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          {(isLoading || isGenerating) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <Lightbulb className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
              <h4 className="text-slate-300 font-medium mb-2">Generating AI Insights</h4>
              <p className="text-slate-500 text-sm max-w-xs">
                Analyzing meeting content and extracting key information...
              </p>
              <div className="flex space-x-1 mt-4">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          ) : generatedSummary || generatedActionItems.length > 0 ? (
            <div className="space-y-6">
              {generatedSummary && (
                <div className="bg-slate-800/30 rounded-xl p-4 sm:p-5 border border-slate-700/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-50">Meeting Summary</h4>
                      <p className="text-xs text-slate-400">Key discussion points</p>
                    </div>
                  </div>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <p className="text-slate-300 leading-relaxed">{generatedSummary}</p>
                  </div>
                </div>
              )}

              {generatedActionItems.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-4 sm:p-5 border border-slate-700/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <ListChecks className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-50">Action Items</h4>
                      <p className="text-xs text-slate-400">{generatedActionItems.length} tasks identified</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {generatedActionItems.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-green-400">{index + 1}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meeting Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-blue-400">⏱️</span>
                    </div>
                    <h5 className="font-medium text-slate-50 text-sm">Duration</h5>
                  </div>
                  <p className="text-lg font-semibold text-white">{meetingStats.duration}</p>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-green-400">👥</span>
                    </div>
                    <h5 className="font-medium text-slate-50 text-sm">People</h5>
                  </div>
                  <p className="text-lg font-semibold text-white">{meetingStats.participantCount}</p>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-purple-400">💬</span>
                    </div>
                    <h5 className="font-medium text-slate-50 text-sm">Messages</h5>
                  </div>
                  <p className="text-lg font-semibold text-white">{meetingStats.messageCount}</p>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-yellow-400">📊</span>
                    </div>
                    <h5 className="font-medium text-slate-50 text-sm">Engagement</h5>
                  </div>
                  <p className="text-lg font-semibold text-white">{meetingStats.engagement}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Lightbulb className="w-8 h-8 text-slate-500" />
              </div>
              <h4 className="text-slate-300 font-medium mb-2">No insights yet</h4>
              <p className="text-slate-500 text-sm max-w-xs">
                Generate meeting insights from the AI Features panel to see analysis here
              </p>
              <Button
                onClick={generateInsights}
                disabled={isGenerating}
                className="mt-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Insights'}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modern Footer */}
      {(generatedSummary || generatedActionItems.length > 0) && (
        <div className="p-4 sm:p-6 border-t border-slate-700/50 bg-slate-800/30">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={exportSummary}
              className="border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-transparent"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-transparent"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button 
              onClick={shareInsights}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
            >
              <Share className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
