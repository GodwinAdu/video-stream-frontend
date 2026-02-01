import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Mic, MicOff, Video, VideoOff, Monitor, Phone, MessageSquare, Users,
    MoreVertical, Sparkles, Settings, Hand, Smile, BarChart3, Pencil,
    Upload, HelpCircle, Shield, Subtitles, DoorOpen, Brain, Lightbulb,
    Keyboard, PictureInPicture, Download, Circle, Maximize, Minimize
} from "lucide-react"

interface ToolbarProps {
    isMuted: boolean
    isVideoOff: boolean
    isScreenSharing: boolean
    isConnected: boolean
    isRecording: boolean
    showChat: boolean
    showParticipants: boolean
    unreadMessages: number
    participantsCount: number
    isHost: boolean
    isPiPSupported: boolean
    isPiPActive: boolean
    showCaptions: boolean
    recordedChunks: Blob[]
    localStream: MediaStream | null
    onToggleMute: () => void
    onToggleVideo: () => void
    onToggleScreenShare: () => void
    onToggleChat: () => void
    onToggleParticipants: () => void
    onLeaveCall: () => void
    onSendReaction: (emoji: string) => void
    onToggleRaiseHand: () => void
    onShowActivities: (activity: string) => void
    onShowSettings: () => void
    onTogglePiP: () => void
    onToggleCaptions: () => void
    onRecordToggle: () => void
    onDownloadRecording: () => void
    onToggleFullscreen: () => void
    isFullscreen: boolean
}

export default function SimplifiedToolbar({
    isMuted, isVideoOff, isScreenSharing, isConnected, isRecording,
    showChat, showParticipants, unreadMessages, participantsCount,
    isHost, isPiPSupported, isPiPActive, showCaptions, recordedChunks,
    localStream, onToggleMute, onToggleVideo, onToggleScreenShare,
    onToggleChat, onToggleParticipants, onLeaveCall, onSendReaction,
    onToggleRaiseHand, onShowActivities, onShowSettings, onTogglePiP,
    onToggleCaptions, onRecordToggle, onDownloadRecording, onToggleFullscreen,
    isFullscreen
}: ToolbarProps) {
    return (
        <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 md:space-x-3 overflow-x-auto max-w-full px-2">
            {/* Primary Controls */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isMuted ? "destructive" : "secondary"}
                        size="sm"
                        onClick={onToggleMute}
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                        disabled={!localStream}
                    >
                        {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isMuted ? "Unmute" : "Mute"}</p></TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isVideoOff ? "destructive" : "secondary"}
                        size="sm"
                        onClick={onToggleVideo}
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                        disabled={!localStream}
                    >
                        {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isVideoOff ? "Turn on camera" : "Turn off camera"}</p></TooltipContent>
            </Tooltip>

            {/* Screen Share - Always visible */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isScreenSharing ? "default" : "secondary"}
                        size="sm"
                        onClick={onToggleScreenShare}
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                        disabled={!isConnected || !localStream}
                    >
                        <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isScreenSharing ? "Stop sharing" : "Share screen"}</p></TooltipContent>
            </Tooltip>

            {/* Reactions - Hidden on mobile */}
            <Popover>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg flex-shrink-0 hidden sm:flex"
                                disabled={!isConnected}
                            >
                                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Reactions</p></TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-2 bg-slate-800 border-slate-700 rounded-xl shadow-2xl">
                    <div className="grid grid-cols-4 gap-2">
                        {["👋", "👍", "❤️", "😂", "🎉", "👏", "🔥", "💯"].map((emoji) => (
                            <Button
                                key={emoji}
                                variant="ghost"
                                size="icon"
                                className="text-2xl hover:bg-slate-700 rounded-lg"
                                onClick={() => onSendReaction(emoji)}
                            >
                                {emoji}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Activities Dropdown - Host Only - Hidden on mobile */}
            {isHost && (
                <Popover>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg flex-shrink-0 hidden md:flex">
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Host Controls</p></TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-64 p-2 bg-slate-800 border-slate-700 rounded-xl shadow-2xl" align="end">
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('polls')}>
                                <BarChart3 className="w-4 h-4 mr-3" />Create Poll
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('breakout')}>
                                <DoorOpen className="w-4 h-4 mr-3" />Breakout Rooms
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('security')}>
                                <Shield className="w-4 h-4 mr-3" />Security
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('ai')}>
                                <Brain className="w-4 h-4 mr-3" />AI Features
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('insights')}>
                                <Lightbulb className="w-4 h-4 mr-3" />Meeting Insights
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            {/* Collaboration Tools - Hidden on mobile */}
            <Popover>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" size="sm" className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg flex-shrink-0 hidden lg:flex">
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Activities</p></TooltipContent>
                </Tooltip>
                <PopoverContent className="w-64 p-2 bg-slate-800 border-slate-700 rounded-xl shadow-2xl" align="end">
                    <div className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('whiteboard')}>
                            <Pencil className="w-4 h-4 mr-3" />Whiteboard
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('polls')}>
                            <BarChart3 className="w-4 h-4 mr-3" />{isHost ? "Polls" : "View Polls"}
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('qa')}>
                            <HelpCircle className="w-4 h-4 mr-3" />Q&A
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('files')}>
                            <Upload className="w-4 h-4 mr-3" />Share Files
                        </Button>
                        {!isHost && (
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onToggleRaiseHand} disabled={!isConnected}>
                                <Hand className="w-4 h-4 mr-3" />Raise Hand
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* More Options */}
            <Popover>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" size="sm" className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg flex-shrink-0">
                                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>More options</p></TooltipContent>
                </Tooltip>
                <PopoverContent className="w-64 p-2 bg-slate-800 border-slate-700 rounded-xl shadow-2xl" align="end">
                    <div className="space-y-1">
                        {/* Mobile-only options */}
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700 sm:hidden" onClick={() => onSendReaction('👍')} disabled={!isConnected}>
                            <Smile className="w-4 h-4 mr-3" />Send Reaction
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onShowSettings}>
                            <Settings className="w-4 h-4 mr-3" />Settings
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('background')}>
                            <Monitor className="w-4 h-4 mr-3" />Virtual Background
                        </Button>
                        {isHost && (
                            <>
                                <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onRecordToggle} disabled={!isConnected}>
                                    <Circle className="w-4 h-4 mr-3" />{isRecording ? "Stop Recording" : "Record Meeting"}
                                </Button>
                                {recordedChunks.length > 0 && !isRecording && (
                                    <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onDownloadRecording}>
                                        <Download className="w-4 h-4 mr-3" />Download Recording
                                    </Button>
                                )}
                            </>
                        )}
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onToggleCaptions}>
                            <Subtitles className="w-4 h-4 mr-3" />{showCaptions ? "Hide" : "Show"} Captions
                        </Button>
                        {isPiPSupported && (
                            <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onTogglePiP}>
                                <PictureInPicture className="w-4 h-4 mr-3" />Picture-in-Picture
                            </Button>
                        )}
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={onToggleFullscreen}>
                            {isFullscreen ? <Minimize className="w-4 h-4 mr-3" /> : <Maximize className="w-4 h-4 mr-3" />}
                            {isFullscreen ? "Exit" : "Enter"} Fullscreen
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm text-slate-100 hover:bg-slate-700" onClick={() => onShowActivities('keyboard')}>
                            <Keyboard className="w-4 h-4 mr-3" />Keyboard Shortcuts
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Chat */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={showChat ? "default" : "secondary"}
                        size="sm"
                        onClick={onToggleChat}
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 relative rounded-full shadow-lg flex-shrink-0"
                    >
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        {unreadMessages > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </div>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Chat</p></TooltipContent>
            </Tooltip>

            {/* Participants */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={showParticipants ? "default" : "secondary"}
                        size="sm"
                        onClick={onToggleParticipants}
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 relative rounded-full shadow-lg flex-shrink-0"
                    >
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        {participantsCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {participantsCount > 9 ? '9+' : participantsCount}
                            </div>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Participants</p></TooltipContent>
            </Tooltip>

            {/* Leave Call */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full shadow-lg bg-red-600 hover:bg-red-700 flex-shrink-0"
                        onClick={onLeaveCall}
                    >
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 rotate-[135deg]" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Leave call</p></TooltipContent>
            </Tooltip>
        </div>
    )
}
