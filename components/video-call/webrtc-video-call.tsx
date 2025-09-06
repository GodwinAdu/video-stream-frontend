"use client"

import { useCallback } from "react"
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
    Copy,
    Crown,
    Hand,
    Smile,
    AlertCircle,
    Loader2,
    Download,
    Lightbulb,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Grid3X3,
    User,
    Wifi,
    WifiOff,
    Keyboard,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useWebRTC } from "@/hooks/use-webrtc"
import ChatPanel from "./chat-panel"
import ParticipantsPanel from "./participants-panel"
import SettingsPanel from "./settings-panel"
import JoinRoomDialog from "./join-room-modal"
import PermissionModal from "./permission-modal"
import AIFeaturesPanel from "./ai-features"
import MeetingInsightsPanel from "./meeting-insight"
import KeyboardShortcuts, { KeyboardShortcutsHelp } from "./keyboard-shortcuts"
import AudioDebug from "./audio-debug"

interface ChatMessage {
    id: string
    senderId: string
    userName: string
    content: string
    timestamp: string
    type: "text" | "system"
}

interface Participant {
    id: string
    name: string
    isLocal: boolean
    isHost: boolean
    stream: MediaStream | null
    isMuted: boolean
    isVideoOff: boolean
    isRaiseHand: boolean
    status: "online" | "offline" | "away"
    joinedAt: string
    lastSeen: string
    activeReaction?: {
        emoji: string
        timestamp: number
    }
}

const ParticipantGrid = ({
    participants,
    currentPage,
    participantsPerPage,
    onToggleVideo,
    speakingParticipants,
}: {
    participants: Participant[]
    currentPage: number
    participantsPerPage: number
    onToggleVideo?: () => void
    speakingParticipants: Set<string>
}) => {
    const startIndex = currentPage * participantsPerPage
    const endIndex = startIndex + participantsPerPage
    const currentParticipants = participants.slice(startIndex, endIndex)
    const count = currentParticipants.length

    const getResponsiveGrid = () => {
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 sm:grid-cols-2"
        if (count <= 4) return "grid-cols-2"
        if (count <= 6) return "grid-cols-2 sm:grid-cols-3"
        if (count <= 9) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
        if (count <= 12) return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-4"
        return "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    }

    const getAspectRatio = () => {
        if (count === 1) return "aspect-video"
        if (count <= 4) return "aspect-video"
        if (count <= 9) return "aspect-[4/3]"
        return "aspect-square"
    }

    return (
        <div className={`grid gap-1 sm:gap-2 md:gap-3 lg:gap-4 h-full w-full ${getResponsiveGrid()}`}>
            {currentParticipants.map((participant) => (
                <div key={participant.id} className={`${getAspectRatio()} min-h-0`}>
                    <ParticipantVideo 
                        participant={participant} 
                        isLarge={count <= 2}
                        onToggleVideo={participant.isLocal ? onToggleVideo : undefined}
                        isSpeaking={speakingParticipants.has(participant.id)}
                    />
                </div>
            ))}
        </div>
    )
}

const ParticipantVideo = ({
    participant,
    isLarge,
    onToggleVideo,
    isSpeaking,
}: {
    participant: Participant
    isLarge?: boolean
    onToggleVideo?: () => void
    isSpeaking?: boolean
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isVideoLoading, setIsVideoLoading] = useState(true)
    const [hasVideoError, setHasVideoError] = useState(false)
    const [isScreenShare, setIsScreenShare] = useState(false)

    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) return

        console.log(`[v0] Setting up video for participant ${participant.id}:`, {
            hasStream: !!participant.stream,
            streamId: participant.stream?.id,
            streamActive: participant.stream?.active,
            videoTracks: participant.stream?.getVideoTracks().length || 0,
            audioTracks: participant.stream?.getAudioTracks().length || 0,
        })

        if (participant.stream && participant.stream.active) {
            // Check if this is screen sharing by looking at video track constraints
            const videoTrack = participant.stream.getVideoTracks()[0]
            const isScreenShareStream = videoTrack && (
                videoTrack.getSettings().displaySurface === 'monitor' ||
                videoTrack.getSettings().displaySurface === 'window' ||
                videoTrack.getSettings().displaySurface === 'application' ||
                videoTrack.label.includes('screen') ||
                videoTrack.label.includes('Screen')
            )
            setIsScreenShare(!!isScreenShareStream)

            // Only update if stream is different
            if (videoElement.srcObject !== participant.stream) {
                videoElement.srcObject = participant.stream
                videoElement.muted = participant.isLocal || false
                videoElement.volume = participant.isLocal ? 0 : 1

                setIsVideoLoading(true)
                setHasVideoError(false)

                const playVideo = async () => {
                    try {
                        await videoElement.play()
                        setIsVideoLoading(false)
                        console.log(`[v0] Video playing for participant ${participant.id}`)
                    } catch (error) {
                        console.error(`[v0] Video play failed for participant ${participant.id}:`, error)
                        setHasVideoError(true)
                        setIsVideoLoading(false)

                        // Retry after a short delay
                        setTimeout(() => {
                            videoElement.play().catch(console.error)
                        }, 1000)
                    }
                }

                playVideo()
            }
        } else {
            videoElement.srcObject = null
            setIsVideoLoading(false)
            setIsScreenShare(false)
        }
    }, [participant.stream, participant.id, participant.isLocal])

    return (
        <div
            className={`relative bg-gray-800 rounded-lg sm:rounded-xl overflow-hidden group transition-all duration-200 w-full h-full ${
                isSpeaking ? "ring-2 sm:ring-4 ring-green-500 ring-opacity-75 shadow-lg shadow-green-500/25" : ""
            }`}
        >
            {participant.stream && !participant.isVideoOff && !hasVideoError ? (
                <>
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${participant.isLocal ? "scale-x-[-1]" : ""}`}
                        autoPlay
                        playsInline
                        muted={participant.isLocal}
                        onLoadedMetadata={() => setIsVideoLoading(false)}
                        onError={() => {
                            console.error(`[v0] Video error for participant ${participant.id}`)
                            setHasVideoError(true)
                            setIsVideoLoading(false)
                        }}
                    />
                    {isVideoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-xl font-semibold text-white">
                                {participant.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </span>
                        </div>
                        <p className="text-white font-medium">{participant.name}</p>
                        <p className="text-gray-300 text-sm">
                            {participant.isVideoOff ? "Camera off" : hasVideoError ? "Video error" : "Connecting..."}
                        </p>
                    </div>
                </div>
            )}

            {/* Video controls overlay */}
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Video toggle for local participant */}
                {participant.isLocal && onToggleVideo && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onToggleVideo}
                                    className="h-8 w-8 bg-black/50 hover:bg-black/70 border-0"
                                >
                                    {participant.isVideoOff ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-white" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{participant.isVideoOff ? "Turn on camera" : "Turn off camera"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                
                {/* Fullscreen button for screen shares */}
                {isScreenShare && !participant.isLocal && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        if (videoRef.current) {
                                            if (videoRef.current.requestFullscreen) {
                                                videoRef.current.requestFullscreen()
                                            }
                                        }
                                    }}
                                    className="h-8 w-8 bg-black/50 hover:bg-black/70 border-0"
                                >
                                    <Maximize className="w-4 h-4 text-white" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View screen share in fullscreen</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2">
                    <div className="flex items-center space-x-1 bg-green-500/90 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-medium hidden sm:inline">Speaking</span>
                    </div>
                </div>
            )}

            {/* Participant info overlay */}
            <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2 flex items-center justify-between">
                <div className="flex items-center space-x-1 sm:space-x-2 bg-black/50 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-0 flex-1 mr-2">
                    <span className="text-white text-xs sm:text-sm font-medium truncate">{participant.name}</span>
                    {participant.isHost && <Crown className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-yellow-400 flex-shrink-0" />}
                    {isScreenShare && <Monitor className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-blue-400 flex-shrink-0" />}
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
                    {participant.isMuted ? (
                        <MicOff className="w-3 sm:w-4 h-3 sm:h-4 text-red-400" />
                    ) : isSpeaking ? (
                        <Mic className="w-3 sm:w-4 h-3 sm:h-4 text-green-400 animate-pulse" />
                    ) : (
                        <Mic className="w-3 sm:w-4 h-3 sm:h-4 text-green-400" />
                    )}
                    {participant.isRaiseHand && <Hand className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-400" />}
                </div>
            </div>
        </div>
    )
}

export default function WebRTCVideoCall() {
    const {
        localStream,
        participants,
        isConnected,
        connectionState,
        socketConnectionHealth,
        isScreenSharing,
        error,
        localParticipantId,
        isVirtualBackgroundEnabled,
        isReconnecting,
        bufferedChatMessages,
        networkQuality,
        bandwidth,
        speakingParticipants,
        joinRoom,
        leaveRoom,
        toggleMute,
        toggleVideo,
        toggleRaiseHand,
        sendReaction,
        toggleVirtualBackground,
        startScreenShare,
        stopScreenShare,
        // sendMessage, // Remove from destructuring
        getParticipantById,
        signalingRef,
        setBufferedChatMessages,
    } = useWebRTC()

    // Enhanced state management
    const [showPermissionModal, setShowPermissionModal] = useState(true)
    const [showJoinDialog, setShowJoinDialog] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
    const [showChat, setShowChat] = useState(false)
    const [showParticipants, setShowParticipants] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showAIFeatures, setShowAIFeatures] = useState(false)
    const [showMeetingInsights, setShowMeetingInsights] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [aiTranscription, setAiTranscription] = useState(true)
    const [noiseReduction, setNoiseReduction] = useState(true)
    const [backgroundBlur, setBackgroundBlur] = useState(false)
    const [autoFraming, setAutoFraming] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewMode, setViewMode] = useState<"gallery" | "speaker" | "focus">("gallery")
    const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null)
    const [volume, setVolume] = useState(50)
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
    const [showToolbar, setShowToolbar] = useState(true)
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: "system-1",
            senderId: "system",
            userName: "System",
            content: "Welcome to the meeting!",
            timestamp: new Date().toLocaleTimeString(),
            type: "system",
        },
    ])
    const [meetingSummary, setMeetingSummary] = useState<string | null>(null)
    const [actionItems, setActionItems] = useState<string[]>([])
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
    const toolbarTimeoutRef = useRef<NodeJS.Timeout>()

    const [currentRoomId, setCurrentRoomId] = useState<string>("")

    // Keyboard shortcuts handlers
    const handleToggleChat = () => setShowChat(!showChat)
    const handleToggleParticipants = () => setShowParticipants(!showParticipants)

    // Enhanced message handling
    // Chat message handling
    const sendChatMessage = useCallback((message: string) => {
        if (signalingRef.current && localParticipantId) {
            signalingRef.current.emit("chat-message", {
                message,
                senderId: localParticipantId,
                timestamp: new Date().toISOString(),
            })
            
            // Add to local messages immediately
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `${localParticipantId}-${Date.now()}`,
                    senderId: localParticipantId,
                    userName: "You",
                    content: message,
                    timestamp: new Date().toLocaleTimeString(),
                    type: "text",
                },
            ])
        }
    }, [localParticipantId, signalingRef])

    const handleIncomingChatMessage = useCallback(
        (message: { message: string; senderId: string; userName: string; timestamp: string }) => {
            // Only add if not from local user (to avoid duplicates)
            if (message.senderId !== localParticipantId) {
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `${message.senderId}-${Date.now()}`,
                        senderId: message.senderId,
                        userName: message.userName,
                        content: message.message,
                        timestamp: new Date(message.timestamp).toLocaleTimeString(),
                        type: "text",
                    },
                ])
            }
        },
        [localParticipantId],
    )

    // Auto-hide toolbar
    const resetToolbarTimeout = useCallback(() => {
        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current)
        setShowToolbar(true)
        toolbarTimeoutRef.current = setTimeout(() => setShowToolbar(false), 3000)
    }, [])

    // Keyboard shortcuts effect
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "?" && !event.ctrlKey && !event.metaKey) {
                event.preventDefault()
                setShowKeyboardHelp(!showKeyboardHelp)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [showKeyboardHelp])

    // Enhanced effects
    useEffect(() => {
        const socket = signalingRef.current
        if (socket) {
            socket.on("chat-message", handleIncomingChatMessage)
            return () => socket.off("chat-message", handleIncomingChatMessage)
        }
    }, [handleIncomingChatMessage, signalingRef])

    useEffect(() => {
        if (bufferedChatMessages.length > 0) {
            const newBufferedMessages: ChatMessage[] = bufferedChatMessages.map((msg) => ({
                id: `${msg.senderId}-${msg.timestamp}`,
                senderId: msg.senderId,
                userName: msg.userName,
                content: msg.message,
                timestamp: new Date(msg.timestamp).toLocaleTimeString(),
                type: "text",
            }))
            setChatMessages((prev) => [...prev, ...newBufferedMessages])
            setBufferedChatMessages([])
        }
    }, [bufferedChatMessages, setBufferedChatMessages])

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            console.log("Setting local video stream:", localStream.id, "active:", localStream.active)
            localVideoRef.current.srcObject = localStream
            const playPromise = localVideoRef.current.play()
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error("Local video play failed:", error)
                    // Retry after a short delay
                    setTimeout(() => {
                        if (localVideoRef.current) {
                            localVideoRef.current.play().catch(console.error)
                        }
                    }, 100)
                })
            }
        } else if (localVideoRef.current) {
            localVideoRef.current.srcObject = null
        }
    }, [localStream])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRecording) {
            interval = setInterval(() => setRecordingTime((prev) => prev + 1), 1000)
        }
        return () => clearInterval(interval)
    }, [isRecording])

    // Enhanced handlers
    const handleRecordToggle = useCallback(() => {
        if (!localStream) return

        if (isRecording) {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
            setRecordingTime(0)
        } else {
            const combinedStream = new MediaStream()
            localStream.getTracks().forEach((track) => combinedStream.addTrack(track))
            participants.forEach((p) => {
                if (p.stream) p.stream.getTracks().forEach((track) => combinedStream.addTrack(track))
            })

            try {
                const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm; codecs=vp8,opus" })
                mediaRecorderRef.current = recorder
                setRecordedChunks([])
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) setRecordedChunks((prev) => [...prev, event.data])
                }
                recorder.start()
                setIsRecording(true)
            } catch (err) {
                console.error("Recording failed:", err)
            }
        }
    }, [localStream, participants, isRecording])

    const handleDownloadRecording = useCallback(() => {
        if (recordedChunks.length === 0) return
        const blob = new Blob(recordedChunks, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `meeting-${new Date().toISOString()}.webm`
        a.click()
        URL.revokeObjectURL(url)
        setRecordedChunks([])
    }, [recordedChunks])

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }, [])

    const toggleSpeaker = useCallback(() => {
        setIsSpeakerMuted(!isSpeakerMuted)
        participants.forEach((participant) => {
            const videoElement = remoteVideoRefs.current.get(participant.id)
            if (videoElement) {
                videoElement.volume = isSpeakerMuted ? 1 : 0
            }
        })
    }, [isSpeakerMuted, participants])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const getConnectionQualityColor = () => {
        if (socketConnectionHealth?.isHealthy) {
            const latency = socketConnectionHealth.latency || 0
            if (latency < 200) return "bg-green-500"
            if (latency < 500) return "bg-yellow-500"
            return "bg-orange-500"
        }
        return connectionState === "connected" ? "bg-green-500" : "bg-red-500"
    }

    const getNetworkIcon = () => {
        switch (networkQuality) {
            case "excellent":
                return <Wifi className="w-4 h-4 text-green-400" />
            case "good":
                return <Wifi className="w-4 h-4 text-yellow-400" />
            case "poor":
                return <WifiOff className="w-4 h-4 text-red-400" />
            default:
                return <WifiOff className="w-4 h-4 text-gray-400" />
        }
    }

    const handleJoinRoom = async (roomId: string, userName: string) => {
        try {
            setCurrentRoomId(roomId)
            await joinRoom(roomId, userName)
            setShowJoinDialog(false)
        } catch (err) {
            console.error("Failed to join room:", err)
        }
    }

    const handleLeaveCall = () => {
        leaveRoom()
        // Clear permission state so it asks again next time
        localStorage.removeItem("media-permissions-granted")
        setShowPermissionModal(true)
        setShowJoinDialog(false)
        setChatMessages([
            {
                id: "system-1",
                senderId: "system",
                userName: "System",
                content: "Welcome to the meeting!",
                timestamp: new Date().toLocaleTimeString(),
                type: "system",
            },
        ])
        setMeetingSummary(null)
        setActionItems([])
    }

    const isMuted = localStream ? !localStream.getAudioTracks()[0]?.enabled : false
    const isVideoOff = localStream ? !localStream.getVideoTracks()[0]?.enabled : false

    // Debug logging for stream state
    useEffect(() => {
        if (localStream) {
            console.log("Local stream updated:", {
                id: localStream.id,
                active: localStream.active,
                videoTracks: localStream.getVideoTracks().length,
                audioTracks: localStream.getAudioTracks().length,
                videoEnabled: localStream.getVideoTracks()[0]?.enabled,
                audioEnabled: localStream.getAudioTracks()[0]?.enabled,
            })
        }
    }, [localStream])

    // Include local participant in the list
    const localParticipant = localParticipantId
        ? {
            id: localParticipantId,
            name: "You",
            isLocal: true,
            isHost: true,
            stream: localStream,
            isMuted,
            isVideoOff,
            isRaiseHand: false,
            status: "online" as const,
            joinedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
        }
        : null

    const allParticipants = [
        ...(localParticipant ? [localParticipant] : []),
        ...participants.map((p) => ({ ...p, isLocal: false })),
    ]

    const getGridLayout = (count: number) => {
        if (viewMode === "speaker" && pinnedParticipant) {
            return "grid-cols-1"
        }

        // Optimized responsive grid
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 sm:grid-cols-2"
        if (count <= 4) return "grid-cols-2"
        if (count <= 6) return "grid-cols-2 sm:grid-cols-3"
        if (count <= 9) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-3"
        if (count <= 12) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        if (count <= 16) return "grid-cols-3 sm:grid-cols-4 md:grid-cols-4"
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
    }

    const [currentPage, setCurrentPage] = useState(0)
    const participantsPerPage = 12 // Show 12 participants per page

    const totalPages = Math.ceil(allParticipants.length / participantsPerPage)
    const hasMultiplePages = totalPages > 1

    if (showPermissionModal) {
        return (
            <PermissionModal
                onPermissionsGranted={() => {
                    setShowPermissionModal(false)
                    setShowJoinDialog(true)
                }}
            />
        )
    }

    if (showJoinDialog) {
        return <JoinRoomDialog onJoin={handleJoinRoom} />
    }

    return (
        <TooltipProvider>
            <div
                className="h-screen flex flex-col bg-gray-950 text-gray-50 relative overflow-hidden"
                onMouseMove={resetToolbarTimeout}
                onClick={resetToolbarTimeout}
            >
                {/* Enhanced Header */}
                <div
                    className={`flex items-center justify-between p-3 sm:p-4 bg-gray-900/90 backdrop-blur-xl border-b border-gray-700/50 transition-transform duration-300 ${showToolbar ? "translate-y-0" : "-translate-y-full"}`}
                >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getConnectionQualityColor()}`} />
                        <span className="text-xs sm:text-sm text-gray-300">Room: {currentRoomId}</span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-gray-400 hover:text-gray-50"
                            onClick={() => {
                                navigator.clipboard.writeText(currentRoomId)
                            }}
                        >
                            <Copy className="w-3 h-3" />
                        </Button>
                        {getNetworkIcon()}
                        {/* Host indicator */}
                        {allParticipants.find(p => p.id === localParticipantId)?.isHost && (
                            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                Host
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {!isConnected && !isReconnecting && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Connecting...
                            </Badge>
                        )}
                        {isReconnecting && (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Reconnecting...
                            </Badge>
                        )}
                        {isRecording && (
                            <Badge variant="destructive" className="bg-red-600/20 text-red-300">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                                REC {formatTime(recordingTime)}
                            </Badge>
                        )}
                        {aiTranscription && (
                            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
                                <Brain className="w-3 h-3 mr-1" />
                                AI Live
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm text-gray-400">{allParticipants.length} participants</span>
                        <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-gray-400 hover:text-gray-50">
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert className="m-4 border-red-500 bg-red-500/10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Main Video Area with Pagination */}
                <div className="flex-1 relative bg-gray-950 overflow-hidden">
                    {/* Enhanced View Mode Controls */}
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 flex flex-wrap gap-1 sm:gap-2">
                        <Button
                            variant={viewMode === "gallery" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("gallery")}
                            className="h-6 sm:h-8 px-2 sm:px-3 text-xs"
                        >
                            <Grid3X3 className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Gallery</span>
                        </Button>
                        <Button
                            variant={viewMode === "speaker" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("speaker")}
                            className="h-6 sm:h-8 px-2 sm:px-3 text-xs"
                        >
                            <User className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Speaker</span>
                        </Button>
                        <Button
                            variant={viewMode === "focus" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("focus")}
                            className="h-6 sm:h-8 px-2 sm:px-3 text-xs"
                        >
                            <Maximize className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Focus</span>
                        </Button>
                        {allParticipants.length > 6 && (
                            <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
                                {allParticipants.length} users
                            </div>
                        )}
                    </div>

                    <div className="h-full p-2 sm:p-4 flex items-center justify-center">
                        <div className="w-full h-full max-w-7xl mx-auto">
                            <ParticipantGrid
                                participants={allParticipants}
                                currentPage={currentPage}
                                participantsPerPage={participantsPerPage}
                                onToggleVideo={toggleVideo}
                                speakingParticipants={speakingParticipants}
                            />
                        </div>

                        {/* Pagination Controls */}
                        {hasMultiplePages && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black/50 rounded-lg px-4 py-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                    disabled={currentPage === 0}
                                    className="text-white hover:bg-white/20"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-white text-sm">
                                    {currentPage + 1} of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="text-white hover:bg-white/20"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Enhanced Bottom Toolbar */}
                <div
                    className={`p-3 sm:p-4 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 transition-transform duration-300 ${showToolbar ? "translate-y-0" : "translate-y-full"}`}
                >
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        {/* Left Controls */}
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 bg-gray-800/60 rounded-xl p-1 shadow-lg">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={isMuted ? "destructive" : "secondary"}
                                            size="sm"
                                            onClick={toggleMute}
                                            className="h-10 w-10 rounded-lg shadow-sm hover:scale-105 transition-transform"
                                            disabled={!localStream}
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
                                            onClick={toggleVideo}
                                            className="h-10 w-10 rounded-lg shadow-sm hover:scale-105 transition-transform"
                                            disabled={!localStream}
                                        >
                                            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isVideoOff ? "Turn on" : "Turn off"} camera</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Separator orientation="vertical" className="h-8 bg-gray-700" />

                            {/* Audio Controls */}
                            <Popover>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button variant="secondary" size="sm" className="h-10 w-10 rounded-lg shadow-sm">
                                                {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Audio settings</p>
                                    </TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-64 p-4 bg-gray-900 border-gray-700">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-300">Speaker Volume</label>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <VolumeX className="w-4 h-4 text-gray-400" />
                                                <Slider
                                                    value={[volume]}
                                                    onValueChange={([value]) => setVolume(value)}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <Volume2 className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-300">Mute Speaker</label>
                                            <Switch checked={isSpeakerMuted} onCheckedChange={toggleSpeaker} />
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <div className="flex items-center space-x-1">
                                <Button
                                    variant={isScreenSharing ? "default" : "secondary"}
                                    size="sm"
                                    onClick={() => (isScreenSharing ? stopScreenShare() : startScreenShare())}
                                    className="h-10 px-3 sm:px-4 rounded-lg shadow-sm hover:scale-105 transition-transform text-sm"
                                    disabled={!isConnected || !localStream}
                                >
                                    <Monitor className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share"}</span>
                                </Button>
                                {isScreenSharing && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={toggleFullscreen}
                                                className="h-10 w-10 rounded-lg shadow-sm hover:scale-105 transition-transform"
                                            >
                                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            <Button
                                variant={isRecording ? "destructive" : "secondary"}
                                size="sm"
                                onClick={handleRecordToggle}
                                className="h-10 px-3 sm:px-4 rounded-lg shadow-sm hover:scale-105 transition-transform text-sm"
                                disabled={!isConnected || !localStream}
                            >
                                <Record className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">{isRecording ? "Stop" : "Record"}</span>
                            </Button>

                            {recordedChunks.length > 0 && !isRecording && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDownloadRecording}
                                    className="h-10 px-3 rounded-lg shadow-sm"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Download</span>
                                </Button>
                            )}
                        </div>

                        {/* Center Controls */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant={
                                    allParticipants.find((p) => p.id === localParticipantId)?.isRaiseHand ? "default" : "secondary"
                                }
                                size="sm"
                                onClick={toggleRaiseHand}
                                className="h-10 w-10 rounded-lg shadow-sm"
                                disabled={!isConnected}
                            >
                                <Hand className="w-4 h-4" />
                            </Button>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-10 w-10 rounded-lg shadow-sm"
                                        disabled={!isConnected}
                                    >
                                        <Smile className="w-4 h-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2 bg-gray-900 border-gray-800 rounded-xl shadow-xl">
                                    <div className="grid grid-cols-4 gap-2">
                                        {["👋", "👍", "❤️", "😂", "🎉", "👏", "🔥", "💯"].map((emoji) => (
                                            <Button
                                                key={emoji}
                                                variant="ghost"
                                                size="icon"
                                                className="text-2xl hover:bg-gray-800 rounded-lg"
                                                onClick={() => sendReaction(emoji)}
                                            >
                                                {emoji}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant={showAIFeatures ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowAIFeatures(!showAIFeatures)}
                                className="h-10 px-3 sm:px-4 rounded-lg shadow-sm"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">AI</span>
                            </Button>
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant={showChat ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowChat(!showChat)}
                                className="h-10 w-10 relative rounded-lg shadow-sm"
                            >
                                <MessageSquare className="w-4 h-4" />
                            </Button>

                            <Button
                                variant={showParticipants ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowParticipants(!showParticipants)}
                                className="h-10 w-10 rounded-lg shadow-sm"
                            >
                                <Users className="w-4 h-4" />
                            </Button>

                            <Button
                                variant={showSettings ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowSettings(!showSettings)}
                                className="h-10 w-10 rounded-lg shadow-sm"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>

                            <Button
                                variant={showMeetingInsights ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowMeetingInsights(!showMeetingInsights)}
                                className="h-10 w-10 rounded-lg shadow-sm"
                            >
                                <Lightbulb className="w-4 h-4" />
                            </Button>

                            <Button
                                variant={showKeyboardHelp ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                                className="h-10 w-10 rounded-lg shadow-sm"
                            >
                                <Keyboard className="w-4 h-4" />
                            </Button>

                            <Separator orientation="vertical" className="h-8 bg-gray-700" />

                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-10 px-3 sm:px-4 rounded-lg shadow-sm"
                                onClick={handleLeaveCall}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Leave</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Audio Debug Panel */}
                {process.env.NODE_ENV === "development" && (
                    <AudioDebug participants={allParticipants} localStream={localStream} />
                )}

                {/* Keyboard Shortcuts */}
                <KeyboardShortcuts
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    onToggleChat={handleToggleChat}
                    onToggleParticipants={handleToggleParticipants}
                    onLeaveCall={handleLeaveCall}
                    onToggleFullscreen={toggleFullscreen}
                />

                {/* Modern Responsive Dialogs */}
                <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
                    <DialogContent className="w-[95vw] max-w-md mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />
                    </DialogContent>
                </Dialog>

                <Dialog open={showChat} onOpenChange={setShowChat}>
                    <DialogContent className="w-[95vw] max-w-md h-[85vh] sm:h-[600px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <ChatPanel
                            onClose={() => setShowChat(false)}
                            onSendMessage={sendChatMessage}
                            messages={chatMessages}
                            localParticipantId={localParticipantId}
                            signalingRef={signalingRef}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
                    <DialogContent className="w-[95vw] max-w-md h-[85vh] sm:h-[600px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <ParticipantsPanel 
                            participants={allParticipants} 
                            onClose={() => setShowParticipants(false)}
                            localParticipantId={localParticipantId}
                            onMuteParticipant={(participantId, mute) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('host-mute-participant', { participantId, mute })
                                }
                            }}
                            onToggleParticipantVideo={(participantId, videoOff) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('host-toggle-video', { participantId, videoOff })
                                }
                            }}
                            onRemoveParticipant={(participantId) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('host-remove-participant', { participantId })
                                }
                            }}
                            onMakeHost={(participantId) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('host-transfer', { newHostId: participantId })
                                }
                            }}
                            onRenameParticipant={(participantId, newName) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('rename-participant', { participantId, newName })
                                }
                            }}
                            roomId={currentRoomId}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <SettingsPanel onClose={() => setShowSettings(false)} />
                    </DialogContent>
                </Dialog>

                <Dialog open={showAIFeatures} onOpenChange={setShowAIFeatures}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
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
                            virtualBackgroundsEnabled={isVirtualBackgroundEnabled}
                            setVirtualBackgroundsEnabled={toggleVirtualBackground}
                            onGenerateMeetingInsights={() => { }}
                            isGeneratingInsights={isGeneratingInsights}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showMeetingInsights} onOpenChange={setShowMeetingInsights}>
                    <DialogContent className="w-[95vw] max-w-2xl h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <MeetingInsightsPanel
                            onClose={() => setShowMeetingInsights(false)}
                            summary={meetingSummary}
                            actionItems={actionItems}
                            isLoading={isGeneratingInsights}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
