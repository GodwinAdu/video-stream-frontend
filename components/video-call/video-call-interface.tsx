"use client"

import { useState, useRef, useEffect } from "react"
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    Phone,
    MessageSquare,
    Users,
    Settings,
    CreditCard as Record,
    Sparkles,
    Brain,
    Eye,
    Wand2,
    FileText,
    Share,
    Copy,
    Crown,
    Hand,
    Smile,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ChatPanel from "./chat-panel"
import ParticipantsPanel from "./participants-panel"
import SettingsPanel from "./settings-panel"
import AIFeaturesPanel from "./ai-features"


interface Participant {
    id: string
    name: string
    avatar?: string
    isMuted: boolean
    isVideoOff: boolean
    isHost: boolean
    isRaiseHand: boolean
}

export default function VideoCallInterface() {
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [showParticipants, setShowParticipants] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showAIFeatures, setShowAIFeatures] = useState(false)
    const [volume, setVolume] = useState([80])
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("excellent")
    const [recordingTime, setRecordingTime] = useState(0)
    const [aiTranscription, setAiTranscription] = useState(true)
    const [noiseReduction, setNoiseReduction] = useState(true)
    const [backgroundBlur, setBackgroundBlur] = useState(false)
    const [autoFraming, setAutoFraming] = useState(false)

    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)

    const roomId = "room-abc-123"
    const participants: Participant[] = [
        { id: "1", name: "You", isMuted: false, isVideoOff: false, isHost: true, isRaiseHand: false },
        { id: "2", name: "Sarah Chen", isMuted: false, isVideoOff: false, isHost: false, isRaiseHand: false },
        { id: "3", name: "Mike Johnson", isMuted: true, isVideoOff: false, isHost: false, isRaiseHand: true },
        { id: "4", name: "Emma Davis", isMuted: false, isVideoOff: true, isHost: false, isRaiseHand: false },
    ]

    // Recording timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isRecording])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case "excellent":
                return "bg-green-500"
            case "good":
                return "bg-yellow-500"
            case "poor":
                return "bg-red-500"
            default:
                return "bg-slate-500"
        }
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    return (
        <TooltipProvider>
            <div className="h-screen flex flex-col bg-slate-900 text-white relative">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getQualityColor(connectionQuality)}`} />
                            <span className="text-sm text-slate-300">Room: {roomId}</span>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                        {isRecording && (
                            <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
                            </div>
                        )}
                        {aiTranscription && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                <Brain className="w-3 h-3 mr-1" />
                                AI Transcription
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-400">{participants.length} participants</span>
                        <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                            <Monitor className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Share className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex relative">
                    {/* Video Area */}
                    <div className="flex-1 p-4 relative">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Remote Video */}
                            <Card className="relative overflow-hidden bg-slate-800 border-slate-700 group">
                                <video
                                    ref={remoteVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                    poster="/placeholder.svg?height=400&width=600"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Remote User Info */}
                                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                                    <Avatar className="w-8 h-8 border-2 border-white/20">
                                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                        <AvatarFallback>SC</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">Sarah Chen</p>
                                        <div className="flex items-center space-x-1">
                                            {participants[1]?.isMuted ? (
                                                <MicOff className="w-3 h-3 text-red-400" />
                                            ) : (
                                                <Mic className="w-3 h-3 text-green-400" />
                                            )}
                                            <div className="flex space-x-1">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="w-1 h-3 bg-green-400 rounded animate-pulse"
                                                        style={{ animationDelay: `${i * 0.1}s` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Features Overlay */}
                                {backgroundBlur && (
                                    <div className="absolute top-4 right-4">
                                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Background Blur
                                        </Badge>
                                    </div>
                                )}
                            </Card>

                            {/* Local Video */}
                            <Card className="relative overflow-hidden bg-slate-800 border-slate-700 group">
                                <video
                                    ref={localVideoRef}
                                    className="w-full h-full object-cover scale-x-[-1]"
                                    autoPlay
                                    playsInline
                                    muted
                                    poster="/placeholder.svg?height=400&width=600"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Local User Info */}
                                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                                    <Avatar className="w-8 h-8 border-2 border-white/20">
                                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                        <AvatarFallback>You</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">You</p>
                                        <div className="flex items-center space-x-1">
                                            <Crown className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs text-slate-300">Host</span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Features */}
                                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                                    {autoFraming && (
                                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                                            <Eye className="w-3 h-3 mr-1" />
                                            Auto Frame
                                        </Badge>
                                    )}
                                    {noiseReduction && (
                                        <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                                            <Wand2 className="w-3 h-3 mr-1" />
                                            Noise Reduction
                                        </Badge>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* AI Transcription Overlay */}
                        {aiTranscription && (
                            <div className="absolute bottom-20 left-4 right-4 lg:right-1/2 lg:mr-2">
                                <Card className="bg-black/80 backdrop-blur-sm border-slate-600 p-3">
                                    <div className="flex items-start space-x-2">
                                        <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-300">
                                                <span className="text-blue-400 font-medium">Sarah:</span> "I think we should focus on the AI
                                                integration features for the next sprint..."
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Live transcription powered by AI</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Side Panels */}
                    {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
                    {showParticipants && (
                        <ParticipantsPanel participants={participants} onClose={() => setShowParticipants(false)} />
                    )}
                    {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
                    {showAIFeatures && (
                        <AIFeaturesPanel
                            onClose={() => setShowAIFeatures(false)}
                            noiseReduction={noiseReduction}
                            setNoiseReduction={setNoiseReduction}
                            backgroundBlur={backgroundBlur}
                            setBackgroundBlur={setBackgroundBlur}
                            autoFraming={autoFraming}
                            setAutoFraming={setAutoFraming}
                            aiTranscription={aiTranscription}
                            setAiTranscription={setAiTranscription}
                        />
                    )}
                </div>

                {/* Bottom Toolbar */}
                <div className="p-4 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        {/* Left Controls */}
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 bg-slate-700/50 rounded-lg p-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={isMuted ? "destructive" : "secondary"}
                                            size="sm"
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="h-10 w-10"
                                        >
                                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isMuted ? "Unmute" : "Mute"} microphone</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={isVideoOff ? "destructive" : "secondary"}
                                            size="sm"
                                            onClick={() => setIsVideoOff(!isVideoOff)}
                                            className="h-10 w-10"
                                        >
                                            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isVideoOff ? "Turn on" : "Turn off"} camera</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Separator orientation="vertical" className="h-6 bg-slate-600" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isScreenSharing ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                                        className="h-10"
                                    >
                                        <Monitor className="w-4 h-4 mr-2" />
                                        {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Share your screen</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isRecording ? "destructive" : "secondary"}
                                        size="sm"
                                        onClick={() => {
                                            setIsRecording(!isRecording)
                                            if (!isRecording) setRecordingTime(0)
                                        }}
                                        className="h-10"
                                    >
                                        <Record className="w-4 h-4 mr-2" />
                                        {isRecording ? "Stop Recording" : "Record"}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isRecording ? "Stop" : "Start"} recording</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Center Controls */}
                        <div className="flex items-center space-x-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-10 w-10">
                                        <Hand className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Raise hand</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-10 w-10">
                                        <Smile className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Reactions</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showAIFeatures ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => setShowAIFeatures(!showAIFeatures)}
                                        className="h-10"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        AI Features
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>AI-powered features</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center space-x-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showChat ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => setShowChat(!showChat)}
                                        className="h-10 w-10 relative"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">3</Badge>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Toggle chat</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showParticipants ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => setShowParticipants(!showParticipants)}
                                        className="h-10 w-10"
                                    >
                                        <Users className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Show participants</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showSettings ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="h-10 w-10"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Settings</p>
                                </TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="h-6 bg-slate-600" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" size="sm" className="h-10">
                                        <Phone className="w-4 h-4 mr-2" />
                                        Leave Call
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Leave the call</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
