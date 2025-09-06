"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, MicOff, Video, VideoOff, PhoneOff, Hand, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWebRTC } from "@/hooks/use-web-rtc"

interface VideoConferenceProps {
  roomId?: string
  userName?: string
  serverUrl?: string
}

export function VideoConference({
  roomId: initialRoomId = "test-room",
  userName: initialUserName = "",
  serverUrl = "ws://localhost:3001",
}: VideoConferenceProps) {
  const [roomId, setRoomId] = useState(initialRoomId)
  const [userName, setUserName] = useState(initialUserName)
  const [isJoining, setIsJoining] = useState(false)

  const {
    participants,
    localStream,
    isConnected,
    connectionState,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleRaiseHand,
    sendReaction,
  } = useWebRTC(serverUrl)

  // Find local participant
  const localParticipant = participants.find((p) => p.id === (window as any).socketId)
  const remoteParticipants = participants.filter((p) => p.id !== (window as any).socketId)

  const handleJoinRoom = async () => {
    if (!userName.trim() || !roomId.trim()) return

    setIsJoining(true)
    try {
      await joinRoom(roomId, userName.trim())
    } catch (err) {
      console.error("Failed to join room:", err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveRoom = () => {
    leaveRoom()
  }

  // Auto-join if we have initial values
  useEffect(() => {
    if (initialRoomId && initialUserName && !isConnected) {
      handleJoinRoom()
    }
  }, [initialRoomId, initialUserName, isConnected])

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Join Video Conference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              disabled={isJoining}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="roomId" className="text-sm font-medium">
              Room ID
            </label>
            <Input
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              disabled={isJoining}
            />
          </div>

          <Button
            onClick={handleJoinRoom}
            disabled={!userName.trim() || !roomId.trim() || isJoining}
            className="w-full"
          >
            {isJoining ? "Joining..." : "Join Room"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Video Conference</h1>
          <Badge variant="outline">Room: {roomId}</Badge>
          <Badge variant={connectionState === "connected" ? "default" : "secondary"}>{connectionState}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participants.length}
          </Badge>
          <Button variant="destructive" onClick={handleLeaveRoom}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div
          className={cn(
            "grid gap-4 h-full",
            participants.length === 1 && "grid-cols-1",
            participants.length === 2 && "grid-cols-2",
            participants.length <= 4 && participants.length > 2 && "grid-cols-2 grid-rows-2",
            participants.length > 4 && "grid-cols-3 auto-rows-fr",
          )}
        >
          {/* Local Participant */}
          {localParticipant && (
            <VideoParticipant
              participant={localParticipant}
              isLocal={true}
              className={participants.length === 1 ? "col-span-full row-span-full" : ""}
            />
          )}

          {/* Remote Participants */}
          {remoteParticipants.map((participant) => (
            <VideoParticipant key={participant.id} participant={participant} isLocal={false} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-muted/50">
        <Button
          variant={localParticipant?.isMuted ? "destructive" : "default"}
          size="lg"
          onClick={toggleMute}
          className="rounded-full w-12 h-12 p-0"
        >
          {localParticipant?.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant={localParticipant?.isVideoOff ? "destructive" : "default"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full w-12 h-12 p-0"
        >
          {localParticipant?.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <Button
          variant={localParticipant?.isRaiseHand ? "secondary" : "outline"}
          size="lg"
          onClick={toggleRaiseHand}
          className="rounded-full w-12 h-12 p-0"
        >
          <Hand className="w-5 h-5" />
        </Button>

        {/* Reaction Buttons */}
        <div className="flex gap-2">
          {["👍", "👏", "❤️", "😂"].map((emoji) => (
            <Button key={emoji} variant="outline" size="sm" onClick={() => sendReaction(emoji)} className="text-lg">
              {emoji}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
