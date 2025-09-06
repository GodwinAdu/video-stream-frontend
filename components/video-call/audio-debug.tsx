"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Volume2, VolumeX } from "lucide-react"

interface AudioDebugProps {
    participants: any[]
    localStream: MediaStream | null
}

export default function AudioDebug({ participants, localStream }: AudioDebugProps) {
    const [audioInfo, setAudioInfo] = useState<any[]>([])

    useEffect(() => {
        const updateAudioInfo = () => {
            const info = participants.map(p => {
                const videoEl = document.querySelector(`video[data-participant="${p.id}"]`) as HTMLVideoElement
                return {
                    id: p.id,
                    name: p.name,
                    isLocal: p.isLocal,
                    hasStream: !!p.stream,
                    audioTracks: p.stream ? p.stream.getAudioTracks().length : 0,
                    videoTracks: p.stream ? p.stream.getVideoTracks().length : 0,
                    videoMuted: videoEl?.muted || false,
                    videoVolume: videoEl?.volume || 0,
                    streamActive: p.stream?.active || false,
                    audioEnabled: p.stream ? p.stream.getAudioTracks().some((t: MediaStreamTrack) => t.enabled) : false,
                    videoEnabled: p.stream ? p.stream.getVideoTracks().some((t: MediaStreamTrack) => t.enabled) : false
                }
            })
            setAudioInfo(info)
        }

        updateAudioInfo()
        const interval = setInterval(updateAudioInfo, 1000)
        return () => clearInterval(interval)
    }, [participants])

    const enableAllAudio = () => {
        participants.forEach(p => {
            if (!p.isLocal && p.stream) {
                const videoEl = document.querySelector(`video[data-participant="${p.id}"]`) as HTMLVideoElement
                if (videoEl) {
                    videoEl.muted = false
                    videoEl.volume = 1
                    videoEl.play().catch(console.error)
                }
            }
        })
    }

    return (
        <Card className="fixed top-4 right-4 p-4 bg-gray-900/95 backdrop-blur-xl border-gray-700/50 max-w-sm z-50">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-200">Audio Debug</h3>
                    <Button size="sm" onClick={enableAllAudio} className="h-6 px-2 text-xs">
                        <Volume2 className="w-3 h-3 mr-1" />
                        Enable All
                    </Button>
                </div>
                {audioInfo.map(info => (
                    <div key={info.id} className="text-xs space-y-1 p-2 bg-gray-800/50 rounded">
                        <div className="font-medium text-gray-300">{info.name}</div>
                        <div className="grid grid-cols-2 gap-1 text-gray-400">
                            <div>Stream: {info.hasStream ? '✅' : '❌'}</div>
                            <div>Audio Tracks: {info.audioTracks}</div>
                            <div>Video Tracks: {info.videoTracks}</div>
                            <div>Video Muted: {info.videoMuted ? '🔇' : '🔊'}</div>
                            <div>Volume: {info.videoVolume}</div>
                            <div>Stream Active: {info.streamActive ? '✅' : '❌'}</div>
                            <div>Audio Enabled: {info.audioEnabled ? '✅' : '❌'}</div>
                            <div>Video Enabled: {info.videoEnabled ? '✅' : '❌'}</div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}