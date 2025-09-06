"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Video, VideoOff, Hand } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Participant } from "@/hooks/use-webrtc"

interface VideoParticipantProps {
    participant: Participant
    isLocal?: boolean
    className?: string
}

export function VideoParticipant({ participant, isLocal = false, className }: VideoParticipantProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isVideoLoaded, setIsVideoLoaded] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)

    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) return

        setIsVideoLoaded(false)
        setVideoError(null)

        if (!participant.stream) {
            console.log(`[VideoParticipant] No stream for ${participant.name}, showing avatar`)
            return
        }

        console.log(`[VideoParticipant] Setting up video for ${participant.name} (${participant.id})`, {
            hasStream: !!participant.stream,
            streamId: participant.stream.id,
            videoTracks: participant.stream.getVideoTracks().length,
            audioTracks: participant.stream.getAudioTracks().length,
            isLocal,
        })

        try {
            videoElement.srcObject = participant.stream
            videoElement.muted = isLocal // Always mute local video to prevent feedback
            videoElement.playsInline = true
            videoElement.autoplay = true

            if (!isLocal) {
                const playPromise = videoElement.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log(`[VideoParticipant] Auto-play successful for ${participant.name}`)
                            setIsVideoLoaded(true)
                        })
                        .catch((err) => {
                            console.warn(`[VideoParticipant] Auto-play failed for ${participant.name}:`, err)
                            // Try to play again after a short delay
                            setTimeout(() => {
                                videoElement.play().catch(() => {
                                    console.warn(`[VideoParticipant] Retry play failed for ${participant.name}`)
                                })
                            }, 100)
                        })
                }
            }
        } catch (error) {
            console.error(`[VideoParticipant] Error setting up video for ${participant.name}:`, error)
            setVideoError("Failed to setup video")
        }

        // Handle video events
        const handleLoadedMetadata = () => {
            console.log(`[VideoParticipant] Video metadata loaded for ${participant.name}`)
            setIsVideoLoaded(true)
            setVideoError(null)
        }

        const handleError = (e: Event) => {
            console.error(`[VideoParticipant] Video error for ${participant.name}:`, e)
            setVideoError("Failed to load video")
            setIsVideoLoaded(false)
        }

        const handleLoadStart = () => {
            console.log(`[VideoParticipant] Video load started for ${participant.name}`)
        }

        const handleCanPlay = () => {
            console.log(`[VideoParticipant] Video can play for ${participant.name}`)
            if (!isLocal) {
                videoElement.play().catch((err) => {
                    console.warn(`[VideoParticipant] Can-play auto-play failed for ${participant.name}:`, err)
                })
            }
        }

        const handlePlaying = () => {
            console.log(`[VideoParticipant] Video playing for ${participant.name}`)
            setIsVideoLoaded(true)
            setVideoError(null)
        }

        videoElement.addEventListener("loadedmetadata", handleLoadedMetadata)
        videoElement.addEventListener("error", handleError)
        videoElement.addEventListener("loadstart", handleLoadStart)
        videoElement.addEventListener("canplay", handleCanPlay)
        videoElement.addEventListener("playing", handlePlaying)

        return () => {
            videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
            videoElement.removeEventListener("error", handleError)
            videoElement.removeEventListener("loadstart", handleLoadStart)
            videoElement.removeEventListener("canplay", handleCanPlay)
            videoElement.removeEventListener("playing", handlePlaying)

            // Clean up
            if (videoElement.srcObject) {
                videoElement.srcObject = null
            }
        }
    }, [participant.stream, participant.id, participant.name, isLocal])

    const hasVideoTrack = (participant.stream?.getVideoTracks().length ?? 0) > 0
    const hasAudioTrack = (participant.stream?.getAudioTracks().length ?? 0) > 0
    const videoTrackEnabled = hasVideoTrack && (participant.stream?.getVideoTracks()[0]?.enabled ?? false)
    const showVideo =
        hasVideoTrack && videoTrackEnabled && !participant.isVideoOff && (isVideoLoaded || isLocal) && !videoError

    return (
        <div
            className={cn(
                "relative aspect-video bg-muted rounded-lg overflow-hidden border-2",
                participant.isRaiseHand && "border-yellow-400",
                isLocal && "border-blue-400",
                className,
            )}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className={cn("w-full h-full object-cover", showVideo ? "block" : "hidden")}
                playsInline
                autoPlay
                muted={isLocal}
            />

            {!showVideo && participant.stream && hasVideoTrack && !isVideoLoaded && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Connecting...</p>
                    </div>
                </div>
            )}

            {/* Avatar Fallback */}
            {!showVideo && (!participant.stream || !hasVideoTrack || participant.isVideoOff || videoError) && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Avatar className="w-16 h-16">
                        <AvatarImage src={participant.avatar || "/placeholder.svg"} alt={participant.name} />
                        <AvatarFallback className="text-lg font-semibold">
                            {participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            )}

            {/* Participant Info Overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant={isLocal ? "default" : "secondary"} className="text-xs">
                        {participant.name} {isLocal && "(You)"}
                    </Badge>
                    {participant.isHost && (
                        <Badge variant="outline" className="text-xs">
                            Host
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Audio Status */}
                    {hasAudioTrack ? (
                        participant.isMuted ? (
                            <MicOff className="w-4 h-4 text-red-500" />
                        ) : (
                            <Mic className="w-4 h-4 text-green-500" />
                        )
                    ) : (
                        <MicOff className="w-4 h-4 text-gray-500" />
                    )}

                    {/* Video Status */}
                    {hasVideoTrack ? (
                        participant.isVideoOff ? (
                            <VideoOff className="w-4 h-4 text-red-500" />
                        ) : (
                            <Video className="w-4 h-4 text-green-500" />
                        )
                    ) : (
                        <VideoOff className="w-4 h-4 text-gray-500" />
                    )}

                    {/* Raised Hand */}
                    {participant.isRaiseHand && <Hand className="w-4 h-4 text-yellow-500" />}
                </div>
            </div>

            {/* Reaction Display */}
            {participant.activeReaction && (
                <div className="absolute top-2 right-2 text-2xl animate-bounce">
                    {participant.activeReaction.emoji}
                </div>
            )}
        </div>
    )
}