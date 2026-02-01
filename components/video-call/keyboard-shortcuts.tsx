"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Keyboard } from "lucide-react"
import { toast } from "sonner"

interface KeyboardShortcutsProps {
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onLeaveCall: () => void
  onToggleFullscreen: () => void
  localStream?: MediaStream | null
}

const shortcuts = [
  { key: "M", description: "Toggle microphone", action: "mute" },
  { key: "V", description: "Toggle camera", action: "video" },
  { key: "C", description: "Toggle chat", action: "chat" },
  { key: "P", description: "Toggle participants", action: "participants" },
  { key: "F", description: "Toggle fullscreen", action: "fullscreen" },
  { key: "Ctrl+L", description: "Leave call", action: "leave" },
  { key: "Space", description: "Push to talk (hold)", action: "ptt" },
  { key: "Esc", description: "Exit fullscreen", action: "escape" },
  { key: "1-9", description: "Focus participant", action: "focus" },
  { key: "?", description: "Show shortcuts", action: "help" },
]

export default function KeyboardShortcuts({
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onToggleParticipants,
  onLeaveCall,
  onToggleFullscreen,
  localStream,
}: KeyboardShortcutsProps) {
  const [isPushToTalk, setIsPushToTalk] = useState(false)
  const [wasOriginallyMuted, setWasOriginallyMuted] = useState(false)
  const pushToTalkRef = useRef(false)
  const originalMuteStateRef = useRef(false)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toLowerCase()
      
      switch (key) {
        case "m":
          event.preventDefault()
          onToggleMute()
          toast.success('Microphone toggled')
          break
        case "v":
          event.preventDefault()
          onToggleVideo()
          toast.success('Camera toggled')
          break
        case "c":
          event.preventDefault()
          onToggleChat()
          break
        case "p":
          event.preventDefault()
          onToggleParticipants()
          break
        case "f":
          event.preventDefault()
          onToggleFullscreen()
          break
        case "l":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            onLeaveCall()
          }
          break
        case " ": // Space for push-to-talk
          if (!pushToTalkRef.current && localStream) {
            event.preventDefault()
            pushToTalkRef.current = true
            setIsPushToTalk(true)
            
            // Store original mute state
            const audioTrack = localStream.getAudioTracks()[0]
            if (audioTrack) {
              originalMuteStateRef.current = !audioTrack.enabled
              if (!audioTrack.enabled) {
                audioTrack.enabled = true // Unmute for push-to-talk
                toast.success('Push to talk activated')
              }
            }
          }
          break
        case "escape":
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          break
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          event.preventDefault()
          toast.info(`Focus participant ${key}`)
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " && pushToTalkRef.current && localStream) {
        event.preventDefault()
        pushToTalkRef.current = false
        setIsPushToTalk(false)
        
        // Restore original mute state
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack && originalMuteStateRef.current) {
          audioTrack.enabled = false // Mute again if was originally muted
          toast.success('Push to talk deactivated')
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [onToggleMute, onToggleVideo, onToggleChat, onToggleParticipants, onLeaveCall, onToggleFullscreen, localStream])

  // Show push-to-talk indicator
  useEffect(() => {
    if (isPushToTalk) {
      const indicator = document.createElement('div')
      indicator.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2'
      indicator.innerHTML = '<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div><span>Push to Talk Active</span>'
      document.body.appendChild(indicator)
      
      return () => {
        document.body.removeChild(indicator)
      }
    }
  }, [isPushToTalk])

  return null // This component only handles keyboard events
}

export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredShortcuts = shortcuts.filter(shortcut => 
    shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card className="w-full max-w-md bg-slate-900 border-slate-700 rounded-xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-slate-50 flex items-center justify-between">
          <div className="flex items-center">
            <Keyboard className="w-5 h-5 mr-2" />
            Keyboard Shortcuts
          </div>
          <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
            {shortcuts.length} shortcuts
          </Badge>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Use these shortcuts to control your meeting efficiently
        </CardDescription>
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {filteredShortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50">
            <span className="text-slate-300 text-sm">{shortcut.description}</span>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-xs">
              {shortcut.key}
            </Badge>
          </div>
        ))}
        {filteredShortcuts.length === 0 && (
          <div className="text-center py-4 text-slate-500">
            No shortcuts found matching "{searchTerm}"
          </div>
        )}
        <div className="pt-4 border-t border-slate-700">
          <div className="space-y-2 text-xs text-slate-500">
            <p>💡 <strong>Tip:</strong> Hold Space for push-to-talk</p>
            <p>⚠️ Shortcuts don't work when typing in text fields</p>
            <p>Press <Badge variant="outline" className="mx-1 text-xs">?</Badge> anytime to toggle this help</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}