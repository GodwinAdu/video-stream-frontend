"use client"

import { X, Lightbulb, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface MeetingInsightsPanelProps {
    onClose: () => void
    summary: string | null
    actionItems: string[]
    isLoading: boolean
}

export default function MeetingInsightsPanel({ onClose, summary, actionItems, isLoading }: MeetingInsightsPanelProps) {
    return (
        <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
            {/* Modern Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-50 text-lg">Meeting Insights</h3>
                        <p className="text-xs text-gray-400">AI-powered meeting analysis</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Enhanced Insights Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-4">
                                <Lightbulb className="w-8 h-8 text-yellow-400 animate-pulse" />
                            </div>
                            <h4 className="text-gray-300 font-medium mb-2">Generating AI Insights</h4>
                            <p className="text-gray-500 text-sm max-w-xs">Analyzing meeting content and extracting key information...</p>
                            <div className="flex space-x-1 mt-4">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                            </div>
                        </div>
                    ) : summary || actionItems.length > 0 ? (
                        <div className="space-y-6">
                            {summary && (
                                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-5 border border-gray-700/50">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-50">Meeting Summary</h4>
                                            <p className="text-xs text-gray-400">Key discussion points</p>
                                        </div>
                                    </div>
                                    <div className="prose prose-sm prose-invert max-w-none">
                                        <p className="text-gray-300 leading-relaxed">{summary}</p>
                                    </div>
                                </div>
                            )}

                            {actionItems.length > 0 && (
                                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-5 border border-gray-700/50">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                            <ListChecks className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-50">Action Items</h4>
                                            <p className="text-xs text-gray-400">{actionItems.length} tasks identified</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {actionItems.map((item, index) => (
                                            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                                                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-medium text-green-400">{index + 1}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Additional Insights Sections */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-xs text-blue-400">📊</span>
                                        </div>
                                        <h5 className="font-medium text-gray-50 text-sm">Engagement</h5>
                                    </div>
                                    <p className="text-xs text-gray-400">High participation from all attendees</p>
                                </div>

                                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-xs text-purple-400">⏱️</span>
                                        </div>
                                        <h5 className="font-medium text-gray-50 text-sm">Duration</h5>
                                    </div>
                                    <p className="text-xs text-gray-400">Meeting ran efficiently</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                                <Lightbulb className="w-8 h-8 text-gray-500" />
                            </div>
                            <h4 className="text-gray-300 font-medium mb-2">No insights yet</h4>
                            <p className="text-gray-500 text-sm max-w-xs">Generate meeting insights from the AI Features panel to see analysis here</p>
                            <Button variant="outline" className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-800/50">
                                Open AI Features
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Modern Footer */}
            {(summary || actionItems.length > 0) && (
                <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
                    <div className="flex space-x-3">
                        <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800/50">
                            📄 Export Summary
                        </Button>
                        <Button className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white">
                            📧 Share Insights
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
