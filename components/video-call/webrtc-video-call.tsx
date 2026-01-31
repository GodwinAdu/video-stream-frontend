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
    BarChart3,
    DoorOpen,
    Pencil,
    Upload,
    PictureInPicture,
    HelpCircle,
    Shield,
    Subtitles,
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
import SimplifiedToolbar from "./toolbar-simplified"
import AudioDebug from "./audio-debug"
import VirtualBackgroundPanel from "./virtual-background-panel"
import BreakoutRoomsPanel from "./breakout-rooms-panel"
import PollsPanel from "./polls-panel"
import WhiteboardPanel from "./whiteboard-panel"
import FileSharingPanel from "./file-sharing-panel"
import QAPanel from "./qa-panel"
import SecurityPanel from "./security-panel"
import LiveCaptions from "./live-captions"
import Dashboard from "../dashboard/dashboard"
import WaitingRoom from "./waiting-room"
import { Toaster } from "sonner"
import { getAuth } from "@/lib/auth"
import { usePictureInPicture } from "@/hooks/use-picture-in-picture"

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
    viewMode,
    pinnedParticipant,
    setPinnedParticipant,
}: {
    participants: Participant[]
    currentPage: number
    participantsPerPage: number
    onToggleVideo?: () => void
    speakingParticipants: Set<string>
    viewMode: "gallery" | "speaker" | "focus"
    pinnedParticipant: string | null
    setPinnedParticipant?: (id: string | null) => void
}) => {
    // Sort participants: speaking first, then others
    const sortedParticipants = [...participants].sort((a, b) => {
        const aIsSpeaking = speakingParticipants.has(a.id)
        const bIsSpeaking = speakingParticipants.has(b.id)
        if (aIsSpeaking && !bIsSpeaking) return -1
        if (!aIsSpeaking && bIsSpeaking) return 1
        return 0
    })
    
    const startIndex = currentPage * participantsPerPage
    const endIndex = startIndex + participantsPerPage
    const currentParticipants = sortedParticipants.slice(startIndex, endIndex)
    const count = currentParticipants.length

    // Speaker view: show active speaker large with others in sidebar
    if (viewMode === "speaker") {
        const activeSpeaker = Array.from(speakingParticipants)[0]
        const mainParticipant = participants.find(p => p.id === activeSpeaker) || participants[0]
        const sidebarParticipants = participants.filter(p => p.id !== mainParticipant?.id).slice(0, 4)

        return (
            <div className="h-full flex gap-3 md:gap-4 lg:gap-6 p-4 md:p-6 lg:p-8 max-w-[1920px] mx-auto">
                {/* Main speaker */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full h-full max-w-6xl">
                        {mainParticipant && (
                            <ParticipantVideo 
                                participant={mainParticipant} 
                                isLarge={true}
                                onToggleVideo={mainParticipant.isLocal ? onToggleVideo : undefined}
                                isSpeaking={speakingParticipants.has(mainParticipant.id)}
                            />
                        )}
                    </div>
                </div>
                {/* Sidebar */}
                {sidebarParticipants.length > 0 && (
                    <div className="w-40 md:w-48 lg:w-56 xl:w-64 flex flex-col gap-3 md:gap-4 overflow-y-auto">
                        {sidebarParticipants.map((participant) => (
                            <div key={participant.id} className="aspect-[4/3]">
                                <ParticipantVideo 
                                    participant={participant} 
                                    isLarge={false}
                                    onToggleVideo={participant.isLocal ? onToggleVideo : undefined}
                                    isSpeaking={speakingParticipants.has(participant.id)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Focus view: show pinned participant large with others in scrollable sidebar
    if (viewMode === "focus") {
        const focusParticipant = pinnedParticipant 
            ? participants.find(p => p.id === pinnedParticipant) 
            : participants.find(p => p.isLocal) || participants[0]
        
        // Get other participants (excluding the focused one)
        const otherParticipants = participants.filter(p => p.id !== focusParticipant?.id)
        
        // Pagination for sidebar participants
        const sidebarPerPage = 6
        const sidebarTotalPages = Math.ceil(otherParticipants.length / sidebarPerPage)
        const sidebarStartIndex = currentPage * sidebarPerPage
        const sidebarEndIndex = sidebarStartIndex + sidebarPerPage
        const currentSidebarParticipants = otherParticipants.slice(sidebarStartIndex, sidebarEndIndex)

        return (
            <div className="h-full flex flex-col md:flex-row gap-2 md:gap-3 lg:gap-4 p-2 md:p-4 lg:p-6">
                {/* Main focused participant */}
                <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="w-full h-full max-w-7xl">
                        {focusParticipant && (
                            <ParticipantVideo 
                                participant={focusParticipant} 
                                isLarge={true}
                                onToggleVideo={focusParticipant.isLocal ? onToggleVideo : undefined}
                                isSpeaking={speakingParticipants.has(focusParticipant.id)}
                            />
                        )}
                    </div>
                </div>
                
                {/* Sidebar with other participants */}
                {otherParticipants.length > 0 && (
                    <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-visible w-full md:w-32 lg:w-40 xl:w-48 h-24 md:h-auto pb-2 md:pb-0">
                        {currentSidebarParticipants.map((participant) => (
                            <div 
                                key={participant.id} 
                                className="flex-shrink-0 w-32 h-20 md:w-full md:h-auto md:aspect-[4/3] cursor-pointer"
                                onClick={() => setPinnedParticipant(participant.id)}
                            >
                                <ParticipantVideo 
                                    participant={participant} 
                                    isLarge={false}
                                    onToggleVideo={participant.isLocal ? onToggleVideo : undefined}
                                    isSpeaking={speakingParticipants.has(participant.id)}
                                />
                            </div>
                        ))}
                        
                        {/* Sidebar pagination indicator */}
                        {sidebarTotalPages > 1 && (
                            <div className="flex-shrink-0 w-32 md:w-full flex items-center justify-center bg-black/40 rounded-lg p-2">
                                <span className="text-white text-xs">
                                    {currentPage + 1}/{sidebarTotalPages}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Gallery view: default grid layout
    const getResponsiveGrid = () => {
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 md:grid-cols-2"
        if (count <= 4) return "grid-cols-2 lg:grid-cols-2"
        if (count <= 6) return "grid-cols-2 md:grid-cols-3"
        if (count <= 9) return "grid-cols-2 md:grid-cols-3"
        if (count <= 12) return "grid-cols-3 md:grid-cols-4"
        if (count <= 16) return "grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
        if (count <= 25) return "grid-cols-4 md:grid-cols-5"
        return "grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
    }

    const getContainerClass = () => {
        if (count === 1) return "max-w-6xl mx-auto px-8 lg:px-16"
        if (count === 2) return "max-w-7xl mx-auto px-6 lg:px-12"
        if (count <= 4) return "max-w-7xl mx-auto px-4 lg:px-8"
        return "w-full px-4 lg:px-6 xl:px-8"
    }

    const getGap = () => {
        if (count === 1) return "gap-0"
        if (count <= 4) return "gap-3 md:gap-4 lg:gap-6"
        if (count <= 9) return "gap-2 md:gap-3 lg:gap-4"
        return "gap-2 md:gap-2.5 lg:gap-3"
    }

    return (
        <div className={`${getContainerClass()} h-full flex items-center justify-center py-4 md:py-6 lg:py-8`}>
            <div className={`grid ${getGap()} w-full auto-rows-fr ${getResponsiveGrid()}`}>
                {currentParticipants.map((participant) => (
                    <div key={participant.id} className="relative w-full" style={{ aspectRatio: count === 1 ? '16/9' : count <= 4 ? '4/3' : '1/1' }}>
                        <ParticipantVideo 
                            participant={participant} 
                            isLarge={count <= 2}
                            onToggleVideo={participant.isLocal ? onToggleVideo : undefined}
                            isSpeaking={speakingParticipants.has(participant.id)}
                        />
                    </div>
                ))}
            </div>
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
            isVideoOff: participant.isVideoOff,
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
    }, [participant.stream, participant.id, participant.isLocal, participant.isVideoOff])

    return (
        <div
            className={`relative bg-gray-800 rounded-xl lg:rounded-2xl overflow-hidden group transition-all duration-200 w-full h-full shadow-lg ${
                isSpeaking 
                    ? "ring-4 sm:ring-[6px] ring-green-400 shadow-2xl shadow-green-400/50 scale-[1.02]" 
                    : "ring-1 ring-gray-700/50 hover:ring-2 hover:ring-gray-600/50"
            }`}
        >
            {participant.stream && participant.stream.active && !participant.isVideoOff && !hasVideoError ? (
                <>
                    <video
                        ref={videoRef}
                        className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'} ${participant.isLocal ? "scale-x-[-1]" : ""}`}
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
                <div className="w-full h-full flex items-center justify-center bg-[#202124]">
                    <div className="flex flex-col items-center justify-center gap-3">
                        {/* Google Meet style avatar */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-[#5f6368] rounded-full flex items-center justify-center">
                            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white">
                                {participant.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </span>
                        </div>
                        
                        {/* Name */}
                        <p className="text-white font-normal text-sm sm:text-base md:text-lg text-center px-4 max-w-full truncate">
                            {participant.name}
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

            {/* Speaking indicator - More prominent */}
            {isSpeaking && (
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20">
                    <div className="flex items-center space-x-1.5 bg-green-500 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        <span className="text-white text-xs sm:text-sm font-semibold">Speaking</span>
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
        screenSharingParticipantId,
        joinRoom,
        leaveRoom,
        toggleMute,
        toggleVideo,
        toggleRaiseHand,
        sendReaction,
        toggleVirtualBackground,
        applyVirtualBackground,
        startScreenShare,
        stopScreenShare,
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
    const [showVirtualBackground, setShowVirtualBackground] = useState(false)
    const [showBreakoutRooms, setShowBreakoutRooms] = useState(false)
    const [showPolls, setShowPolls] = useState(false)
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [showFileSharing, setShowFileSharing] = useState(false)
    const [showQA, setShowQA] = useState(false)
    const [showSecurity, setShowSecurity] = useState(false)
    const [showCaptions, setShowCaptions] = useState(false)
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
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null)
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
    const toolbarTimeoutRef = useRef<NodeJS.Timeout>()

    // Picture-in-Picture
    const { isPiPActive, isPiPSupported, togglePiP } = usePictureInPicture(localVideoRef.current)

    const [currentRoomId, setCurrentRoomId] = useState<string>("")
    const [showDashboard, setShowDashboard] = useState(false)
    const [isInWaitingRoom, setIsInWaitingRoom] = useState(false)
    const [hostName, setHostName] = useState("")

    // Check URL parameters and authentication - only on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const roomParam = urlParams.get('room')
        
        if (roomParam) {
            // Direct room join from URL
            setCurrentRoomId(roomParam)
            setShowJoinDialog(true)
            setShowDashboard(false)
        } else {
            // Check if user is authenticated and should see dashboard
            const auth = getAuth()
            if (auth) {
                setShowDashboard(true)
            }
        }
    }, [])

    // Keyboard shortcuts handlers
    const handleToggleChat = () => {
        setShowChat(!showChat)
        if (!showChat) {
            // Mark messages as read when opening chat
            setUnreadMessages(0)
            if (chatMessages.length > 0) {
                setLastReadMessageId(chatMessages[chatMessages.length - 1].id)
            }
        }
    }
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
                const newMessage = {
                    id: `${message.senderId}-${Date.now()}`,
                    senderId: message.senderId,
                    userName: message.userName,
                    content: message.message,
                    timestamp: new Date(message.timestamp).toLocaleTimeString(),
                    type: "text" as const,
                }
                
                setChatMessages((prev) => [...prev, newMessage])
                
                // Show notification if chat is closed
                if (!showChat) {
                    setUnreadMessages(prev => prev + 1)
                    // Show toast notification
                    import('sonner').then(({ toast }) => {
                        toast.info(`${message.userName}: ${message.message}`, {
                            duration: 4000,
                            action: {
                                label: 'Open Chat',
                                onClick: () => setShowChat(true)
                            }
                        })
                    })
                }
            }
        },
        [localParticipantId, showChat],
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
            
            // Count unread buffered messages if chat is closed
            if (!showChat) {
                const unreadBuffered = newBufferedMessages.filter(msg => msg.senderId !== localParticipantId)
                setUnreadMessages(prev => prev + unreadBuffered.length)
            }
            
            setBufferedChatMessages([])
        }
    }, [bufferedChatMessages, setBufferedChatMessages, showChat, localParticipantId])

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
    const handleRecordToggle = useCallback(async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
            setRecordingTime(0)
        } else {
            try {
                // Capture the entire screen/window to record the meeting interface
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: true // Capture system audio
                })

                // Also capture microphone audio to include local voice
                let micStream: MediaStream | null = null
                try {
                    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
                } catch (micErr) {
                    console.warn("Could not capture microphone for recording:", micErr)
                }

                // Combine display and microphone audio if available
                const combinedStream = new MediaStream()
                displayStream.getVideoTracks().forEach(track => combinedStream.addTrack(track))
                displayStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))
                if (micStream) {
                    micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))
                }

                const recorder = new MediaRecorder(combinedStream, { 
                    mimeType: "video/webm; codecs=vp8,opus" 
                })
                mediaRecorderRef.current = recorder
                setRecordedChunks([])
                
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) setRecordedChunks((prev) => [...prev, event.data])
                }
                
                recorder.onstop = () => {
                    displayStream.getTracks().forEach(track => track.stop())
                    if (micStream) {
                        micStream.getTracks().forEach(track => track.stop())
                    }
                }
                
                // Stop recording if user stops screen sharing
                displayStream.getVideoTracks()[0].onended = () => {
                    if (isRecording) {
                        recorder.stop()
                        setIsRecording(false)
                        setRecordingTime(0)
                    }
                }
                
                recorder.start()
                setIsRecording(true)
                console.log("Started recording entire meeting screen")
            } catch (err) {
                console.error("Screen recording failed:", err)
                alert("Screen recording failed. Please make sure to select the browser window/tab containing the meeting when prompted.")
            }
        }
    }, [isRecording])

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
            // Update URL without page reload
            window.history.replaceState({}, '', `${window.location.pathname}?room=${roomId}`)
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

    // Cleanup effect for connection state changes
    useEffect(() => {
        if (!isConnected && participants.length > 0) {
            console.log('Connection lost, clearing stale participants')
            // Force clear participants when disconnected
            setTimeout(() => {
                if (!isConnected) {
                    console.log('Force clearing participants after disconnect')
                }
            }, 2000)
        }
    }, [isConnected, participants.length])

    // Include local participant in the list
    // Determine if local user is host from participants array or if they're the only one
    const remoteHostExists = participants.some(p => p.isHost)
    const isLocalHost = localParticipantId ? (
        participants.find(p => p.id === localParticipantId)?.isHost || 
        (!remoteHostExists && participants.length === 0)
    ) : false
    
    const localParticipant = localParticipantId
        ? {
            id: localParticipantId,
            name: "You",
            isLocal: true,
            isHost: isLocalHost,
            stream: localStream,
            isMuted,
            isVideoOff,
            isRaiseHand: false,
            status: "online" as const,
            joinedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
        }
        : null

    // Filter out duplicates and ensure no stale participants
    const uniqueParticipants = participants
        .filter(p => p.id !== localParticipantId) // Remove local from remote list
        .filter((p, index, arr) => arr.findIndex(x => x.id === p.id) === index) // Remove duplicates
        .map((p) => ({ ...p, isLocal: false }))

    const allParticipants = [
        ...(localParticipant ? [localParticipant] : []),
        ...uniqueParticipants,
    ]

    // Debug logging
    useEffect(() => {
        console.log('Participants state:', {
            localParticipantId,
            remoteParticipants: participants.length,
            totalParticipants: allParticipants.length,
            participantIds: allParticipants.map(p => ({ id: p.id, name: p.name }))
        })
    }, [participants, localParticipantId, allParticipants.length])

    // Force re-render when participants change
    useEffect(() => {
        console.log('Participants updated:', allParticipants.map(p => `${p.name} (${p.id})`).join(', '))
    }, [allParticipants])

    // Automatic spotlight when screen sharing
    useEffect(() => {
        if (screenSharingParticipantId) {
            // Someone is screen sharing - switch to focus mode and pin them
            console.log(`Screen sharing detected from ${screenSharingParticipantId}, switching to spotlight`)
            setViewMode("focus")
            setPinnedParticipant(screenSharingParticipantId)
            
            // Show toast notification
            import('sonner').then(({ toast }) => {
                const sharingParticipant = allParticipants.find(p => p.id === screenSharingParticipantId)
                const sharerName = sharingParticipant?.name || 'Someone'
                toast.info(`${sharerName} is presenting`, {
                    duration: 3000,
                    icon: '🖥️',
                })
            })
        } else if (pinnedParticipant && viewMode === "focus") {
            // Screen sharing stopped - return to gallery view
            console.log('Screen sharing stopped, returning to gallery view')
            setViewMode("gallery")
            setPinnedParticipant(null)
        }
    }, [screenSharingParticipantId, allParticipants])



    const [currentPage, setCurrentPage] = useState(0)
    const participantsPerPage = 16 // Show 16 participants per page

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

    if (showDashboard) {
        return (
            <Dashboard 
                onStartMeeting={(roomId, userName) => {
                    setShowDashboard(false)
                    handleJoinRoom(roomId, userName)
                }}
                onJoinMeeting={() => {
                    setShowDashboard(false)
                    setShowJoinDialog(true)
                }}
            />
        )
    }

    if (isInWaitingRoom) {
        return (
            <WaitingRoom
                roomId={currentRoomId}
                userName={"You"}
                hostName={hostName}
                onAdmit={() => setIsInWaitingRoom(false)}
                onReject={() => {
                    setIsInWaitingRoom(false)
                    setShowDashboard(true)
                }}
            />
        )
    }

    if (showJoinDialog) {
        return <JoinRoomDialog onJoin={handleJoinRoom} initialRoomId={currentRoomId} />
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
                <div className="flex-1 relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
                    {/* Enhanced View Mode Controls */}
                    <div className="absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8 z-10 flex flex-wrap gap-2 sm:gap-3">
                        <Button
                            variant={viewMode === "gallery" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("gallery")}
                            className="h-8 sm:h-9 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm shadow-lg"
                        >
                            <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Gallery</span>
                        </Button>
                        <Button
                            variant={viewMode === "speaker" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("speaker")}
                            className="h-8 sm:h-9 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm shadow-lg"
                        >
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Speaker</span>
                        </Button>
                        <Button
                            variant={viewMode === "focus" ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setViewMode("focus")}
                            className="h-8 sm:h-9 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm shadow-lg"
                        >
                            <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Focus</span>
                        </Button>
                        {allParticipants.length > 6 && (
                            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 text-xs sm:text-sm text-white shadow-lg border border-gray-700/50">
                                {allParticipants.length} participants
                            </div>
                        )}
                    </div>

                    <div className="h-full p-2 sm:p-4 flex items-center justify-center">
                        <ParticipantGrid
                            participants={allParticipants}
                            currentPage={currentPage}
                            participantsPerPage={participantsPerPage}
                            onToggleVideo={toggleVideo}
                            speakingParticipants={speakingParticipants}
                            viewMode={viewMode}
                            pinnedParticipant={pinnedParticipant}
                            setPinnedParticipant={setPinnedParticipant}
                        />

                    {/* Pagination Controls */}
                    {hasMultiplePages && (
                        <div className="absolute bottom-24 md:bottom-28 lg:bottom-32 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 bg-black/70 backdrop-blur-md rounded-xl px-5 py-3 z-20 shadow-2xl border border-gray-700/50">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage === 0}
                                className="text-white hover:bg-white/20 h-9 w-9 p-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <span className="text-white text-sm font-medium min-w-[60px] text-center">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="text-white hover:bg-white/20 h-9 w-9 p-0"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                    </div>
                </div>

                {/* Simplified Bottom Toolbar - Google Meet Style */}
                <div
                    className={`p-3 sm:p-4 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 transition-transform duration-300 ${showToolbar ? "translate-y-0" : "translate-y-full"}`}
                >
                    <SimplifiedToolbar
                        isMuted={isMuted}
                        isVideoOff={isVideoOff}
                        isScreenSharing={isScreenSharing}
                        isConnected={isConnected}
                        isRecording={isRecording}
                        showChat={showChat}
                        showParticipants={showParticipants}
                        unreadMessages={unreadMessages}
                        participantsCount={allParticipants.length}
                        isHost={allParticipants.find(p => p.id === localParticipantId)?.isHost || false}
                        isPiPSupported={isPiPSupported}
                        isPiPActive={isPiPActive}
                        showCaptions={showCaptions}
                        recordedChunks={recordedChunks}
                        localStream={localStream}
                        onToggleMute={toggleMute}
                        onToggleVideo={toggleVideo}
                        onToggleScreenShare={() => (isScreenSharing ? stopScreenShare() : startScreenShare())}
                        onToggleChat={handleToggleChat}
                        onToggleParticipants={() => setShowParticipants(!showParticipants)}
                        onLeaveCall={handleLeaveCall}
                        onSendReaction={sendReaction}
                        onToggleRaiseHand={toggleRaiseHand}
                        onShowActivities={(activity) => {
                            switch(activity) {
                                case 'whiteboard': setShowWhiteboard(true); break;
                                case 'polls': setShowPolls(true); break;
                                case 'qa': setShowQA(true); break;
                                case 'breakout': setShowBreakoutRooms(true); break;
                                case 'files': setShowFileSharing(true); break;
                                case 'ai': setShowAIFeatures(true); break;
                                case 'insights': setShowMeetingInsights(true); break;
                                case 'security': setShowSecurity(true); break;
                                case 'background': setShowVirtualBackground(true); break;
                                case 'keyboard': setShowKeyboardHelp(true); break;
                            }
                        }}
                        onShowSettings={() => setShowSettings(true)}
                        onTogglePiP={togglePiP}
                        onToggleCaptions={() => setShowCaptions(!showCaptions)}
                        onRecordToggle={handleRecordToggle}
                        onDownloadRecording={handleDownloadRecording}
                        onToggleFullscreen={toggleFullscreen}
                        isFullscreen={isFullscreen}
                    />
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
                    localStream={localStream}
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
                            participants={allParticipants}
                            speakingParticipants={speakingParticipants}
                            onToggleMute={toggleMute}
                            onToggleVideo={toggleVideo}
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
                            onSpotlightParticipant={(participantId) => {
                                if (signalingRef.current) {
                                    signalingRef.current.emit('host-spotlight-participant', { participantId })
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
                            onGenerateMeetingInsights={() => {
                                setIsGeneratingInsights(true)
                                setTimeout(() => {
                                    setMeetingSummary("AI-generated meeting summary with key points and decisions made during the call.")
                                    setActionItems(["Follow up on project timeline", "Schedule next meeting", "Review documentation"])
                                    setIsGeneratingInsights(false)
                                    setShowMeetingInsights(true)
                                }, 3000)
                            }}
                            isGeneratingInsights={isGeneratingInsights}
                            localStream={localStream}
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
                            chatMessages={chatMessages}
                            participants={allParticipants}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showVirtualBackground} onOpenChange={setShowVirtualBackground}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <VirtualBackgroundPanel
                            onClose={() => setShowVirtualBackground(false)}
                            localStream={localStream}
                            onBackgroundChange={(stream) => {
                                applyVirtualBackground(stream)
                            }}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showBreakoutRooms} onOpenChange={setShowBreakoutRooms}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <BreakoutRoomsPanel
                            onClose={() => setShowBreakoutRooms(false)}
                            participants={allParticipants}
                            localParticipantId={localParticipantId}
                            isHost={allParticipants.find(p => p.id === localParticipantId)?.isHost || false}
                            signalingRef={signalingRef}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showPolls} onOpenChange={setShowPolls}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <PollsPanel
                            onClose={() => setShowPolls(false)}
                            localParticipantId={localParticipantId}
                            isHost={allParticipants.find(p => p.id === localParticipantId)?.isHost || false}
                            signalingRef={signalingRef}
                            participants={allParticipants}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showWhiteboard} onOpenChange={setShowWhiteboard}>
                    <DialogContent className="w-[95vw] max-w-4xl h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <WhiteboardPanel
                            onClose={() => setShowWhiteboard(false)}
                            signalingRef={signalingRef}
                            localParticipantId={localParticipantId}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showFileSharing} onOpenChange={setShowFileSharing}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <FileSharingPanel
                            onClose={() => setShowFileSharing(false)}
                            signalingRef={signalingRef}
                            localParticipantId={localParticipantId}
                            participants={allParticipants}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showQA} onOpenChange={setShowQA}>
                    <DialogContent className="w-[95vw] max-w-lg h-[85vh] sm:h-[700px] mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <QAPanel
                            onClose={() => setShowQA(false)}
                            signalingRef={signalingRef}
                            localParticipantId={localParticipantId}
                            isHost={allParticipants.find(p => p.id === localParticipantId)?.isHost || false}
                            participants={allParticipants}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showSecurity} onOpenChange={setShowSecurity}>
                    <DialogContent className="w-[95vw] max-w-md h-auto mx-auto p-0 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
                        <SecurityPanel
                            onClose={() => setShowSecurity(false)}
                            signalingRef={signalingRef}
                            isHost={allParticipants.find(p => p.id === localParticipantId)?.isHost || false}
                            roomId={currentRoomId}
                        />
                    </DialogContent>
                </Dialog>

                {/* Live Captions Overlay */}
                <LiveCaptions
                    isEnabled={showCaptions}
                    onToggle={() => setShowCaptions(false)}
                    localParticipantName={allParticipants.find(p => p.id === localParticipantId)?.name || "You"}
                />
                
                {/* Toast Notifications */}
                <Toaster 
                    position="top-right" 
                    richColors 
                    closeButton
                    theme="dark"
                    toastOptions={{
                        style: {
                            background: 'rgb(31 41 55)',
                            border: '1px solid rgb(75 85 99)',
                            color: 'rgb(243 244 246)'
                        }
                    }}
                />
            </div>
        </TooltipProvider>
    )
}
