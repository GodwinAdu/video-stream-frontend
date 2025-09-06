"use client"

import { X, Sparkles, Brain, Eye, FileText, Zap, Shield, Mic, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AIFeaturesPanelProps {
    onClose: () => void
    noiseReduction: boolean
    setNoiseReduction: (value: boolean) => void
    backgroundBlur: boolean
    setBackgroundBlur: (value: boolean) => void
    autoFraming: boolean
    setAutoFraming: (value: boolean) => void
    aiTranscription: boolean
    setAiTranscription: (value: boolean) => void
    virtualBackgroundsEnabled: boolean
    setVirtualBackgroundsEnabled: (value: boolean) => void
    onGenerateMeetingInsights: () => void
    isGeneratingInsights: boolean
}

export default function AIFeaturesPanel({
    onClose,
    noiseReduction,
    setNoiseReduction,
    backgroundBlur,
    setBackgroundBlur,
    autoFraming,
    setAutoFraming,
    aiTranscription,
    setAiTranscription,
    virtualBackgroundsEnabled,
    setVirtualBackgroundsEnabled,
    onGenerateMeetingInsights,
    isGeneratingInsights,
}: AIFeaturesPanelProps) {
    return (
        <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
            {/* Modern Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-50 text-lg">AI Features</h3>
                            <Badge variant="secondary" className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 text-xs border-purple-500/30 px-2 py-1">
                                ✨ Beta
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-400">Powered by advanced AI technology</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Enhanced AI Features Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6 space-y-6">
                    {/* Audio AI */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Mic className="w-4 h-4 text-green-400" />
                            <h4 className="font-medium text-gray-50">Audio Intelligence</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">AI Noise Reduction</Label>
                                    <p className="text-xs text-gray-500 mt-1">Remove background noise using AI</p>
                                </div>
                                <Switch checked={noiseReduction} onCheckedChange={setNoiseReduction} />
                            </div>

                            {noiseReduction && (
                                <div className="ml-4 space-y-2">
                                    <Label className="text-xs text-gray-400">Noise Reduction Level</Label>
                                    <Slider defaultValue={[75]} max={100} step={5} />
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Voice Enhancement</Label>
                                    <p className="text-xs text-gray-500 mt-1">Enhance voice clarity and tone</p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Echo Cancellation AI</Label>
                                    <p className="text-xs text-gray-500 mt-1">Advanced echo removal</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Video AI */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4 text-blue-400" />
                            <h4 className="font-medium text-gray-50">Video Intelligence</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Background Blur</Label>
                                    <p className="text-xs text-gray-500 mt-1">AI-powered background blur</p>
                                </div>
                                <Switch checked={backgroundBlur} onCheckedChange={setBackgroundBlur} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Auto Framing</Label>
                                    <p className="text-xs text-gray-500 mt-1">Keep you centered in frame</p>
                                </div>
                                <Switch checked={autoFraming} onCheckedChange={setAutoFraming} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Lighting Enhancement</Label>
                                    <p className="text-xs text-gray-500 mt-1">Optimize lighting conditions</p>
                                </div>
                                <Switch />
                            </div>

                            {/* Virtual Backgrounds */}
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Virtual Backgrounds</Label>
                                    <p className="text-xs text-gray-500 mt-1">AI-generated backgrounds</p>
                                </div>
                                <Switch checked={virtualBackgroundsEnabled} onCheckedChange={setVirtualBackgroundsEnabled} />
                            </div>

                            {virtualBackgroundsEnabled && (
                                <div className="ml-4 space-y-2">
                                    <Label className="text-xs text-gray-400">Select Background</Label>
                                    <Select defaultValue="blur">
                                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-50 focus:ring-blue-500 focus:border-blue-500">
                                            <SelectValue placeholder="Select a background" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-gray-50">
                                            <SelectItem value="blur">Blur</SelectItem>
                                            <SelectItem value="office">Office</SelectItem>
                                            <SelectItem value="beach">Beach</SelectItem>
                                            <SelectItem value="space">Space</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Transcription & Analysis */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-yellow-400" />
                            <h4 className="font-medium text-gray-50">Transcription & Analysis</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Live Transcription</Label>
                                    <p className="text-xs text-gray-500 mt-1">Real-time speech-to-text</p>
                                </div>
                                <Switch checked={aiTranscription} onCheckedChange={setAiTranscription} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Meeting Summary</Label>
                                    <p className="text-xs text-gray-500 mt-1">AI-generated meeting notes</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onGenerateMeetingInsights}
                                    disabled={isGeneratingInsights}
                                    className="px-4 rounded-lg"
                                >
                                    <Lightbulb className="w-4 h-4 mr-2" />
                                    {isGeneratingInsights ? "Generating..." : "Generate"}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Action Items Detection</Label>
                                    <p className="text-xs text-gray-500 mt-1">Automatically identify tasks</p>
                                </div>
                                <Switch />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Sentiment Analysis</Label>
                                    <p className="text-xs text-gray-500 mt-1">Analyze meeting mood and engagement</p>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Smart Features */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Brain className="w-4 h-4 text-purple-400" />
                            <h4 className="font-medium text-gray-50">Smart Features</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Smart Mute</Label>
                                    <p className="text-xs text-gray-500 mt-1">Auto-mute when not speaking</p>
                                </div>
                                <Switch />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Gesture Recognition</Label>
                                    <p className="text-xs text-gray-500 mt-1">Control with hand gestures</p>
                                </div>
                                <Switch />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="text-sm text-gray-300">Focus Mode</Label>
                                    <p className="text-xs text-gray-500 mt-1">Highlight active speaker</p>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    {/* Privacy & Security */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-400" />
                            <h4 className="font-medium text-gray-50">Privacy & Security</h4>
                        </div>

                        <div className="bg-gray-800/30 rounded-lg p-3">
                            <p className="text-xs text-gray-300">
                                All AI processing happens locally on your device. No audio or video data is sent to external servers for
                                AI features.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label className="text-sm text-gray-300">Local AI Processing</Label>
                                <p className="text-xs text-gray-500 mt-1">Process AI features on device</p>
                            </div>
                            <Switch defaultChecked disabled />
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Modern Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
                <div className="space-y-3">
                    <Button className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade for Premium AI
                    </Button>
                    <div className="text-center">
                        <p className="text-xs text-gray-500">🔒 All processing happens locally on your device</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
