"use client"

import { useState, useEffect, useRef } from "react"
import { Subtitles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Caption {
    id: string
    text: string
    speaker: string
    timestamp: number
}

interface LiveCaptionsProps {
    isEnabled: boolean
    onToggle: () => void
    localParticipantName: string
}

export default function LiveCaptions({ isEnabled, onToggle, localParticipantName }: LiveCaptionsProps) {
    const [captions, setCaptions] = useState<Caption[]>([])
    const [currentCaption, setCurrentCaption] = useState<Caption | null>(null)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (!isEnabled) {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            setCurrentCaption(null)
            return
        }

        // Check if browser supports speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event: any) => {
            let interimTranscript = ""
            let finalTranscript = ""

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + " "
                } else {
                    interimTranscript += transcript
                }
            }

            if (finalTranscript) {
                const caption: Caption = {
                    id: `caption-${Date.now()}`,
                    text: finalTranscript.trim(),
                    speaker: localParticipantName,
                    timestamp: Date.now(),
                }
                setCaptions(prev => [...prev.slice(-4), caption])
                setCurrentCaption(null)
            } else if (interimTranscript) {
                setCurrentCaption({
                    id: "interim",
                    text: interimTranscript,
                    speaker: localParticipantName,
                    timestamp: Date.now(),
                })
            }
        }

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error)
        }

        recognition.onend = () => {
            if (isEnabled) {
                recognition.start()
            }
        }

        recognition.start()
        recognitionRef.current = recognition

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [isEnabled, localParticipantName])

    // Auto-remove old captions
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            setCaptions(prev => prev.filter(c => now - c.timestamp < 10000))
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    if (!isEnabled) return null

    return (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30 max-w-3xl w-full px-4">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <Subtitles className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-300">Live Captions</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onToggle} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                    </Button>
                </div>

                {/* Captions */}
                <div className="space-y-1">
                    {captions.map(caption => (
                        <div key={caption.id} className="text-white">
                            <span className="text-blue-400 font-medium text-sm">{caption.speaker}: </span>
                            <span className="text-base">{caption.text}</span>
                        </div>
                    ))}
                    {currentCaption && (
                        <div className="text-white opacity-70">
                            <span className="text-blue-400 font-medium text-sm">{currentCaption.speaker}: </span>
                            <span className="text-base">{currentCaption.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
