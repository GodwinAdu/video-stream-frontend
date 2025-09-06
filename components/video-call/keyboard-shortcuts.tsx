"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Keyboard } from "lucide-react"

interface KeyboardShortcutsProps {
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onLeaveCall: () => void
  onToggleFullscreen: () => void
}

const shortcuts = [
  { key: "M", description: "Toggle microphone", action: "mute" },
  { key: "V", description: "Toggle camera", action: "video" },
  { key: "C", description: "Toggle chat", action: "chat" },
  { key: "P", description: "Toggle participants", action: "participants" },
  { key: "F", description: "Toggle fullscreen", action: "fullscreen" },
  { key: "L", description: "Leave call", action: "leave" },
  { key: "Space", description: "Push to talk", action: "ptt" },
  { key: "Esc", description: "Exit fullscreen", action: "escape" },
]

export default function KeyboardShortcuts({
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onToggleParticipants,
  onLeaveCall,
  onToggleFullscreen,
}: KeyboardShortcutsProps) {
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
          break
        case "v":
          event.preventDefault()
          onToggleVideo()
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
        case "escape":
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onToggleMute, onToggleVideo, onToggleChat, onToggleParticipants, onLeaveCall, onToggleFullscreen])

  return null // This component only handles keyboard events
}

export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Card className="w-full max-w-md bg-gray-900 border-gray-700 rounded-xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-gray-50 flex items-center">
          <Keyboard className="w-5 h-5 mr-2" />
          Keyboard Shortcuts
        </CardTitle>
        <CardDescription className="text-gray-400">
          Use these shortcuts to control your meeting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">{shortcut.description}</span>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300 font-mono">
              {shortcut.key === "Space" ? "Space" : shortcut.key.toUpperCase()}
            </Badge>
          </div>
        ))}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Press <Badge variant="outline" className="mx-1 text-xs">?</Badge> to show/hide this help
          </p>
        </div>
      </CardContent>
    </Card>
  )
}