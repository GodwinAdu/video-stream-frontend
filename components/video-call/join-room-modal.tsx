"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, Mic, MicOff, VideoOff, Settings, Users, Clock, Shield, Loader2 } from "lucide-react"

interface JoinRoomDialogProps {
  onJoin: (roomId: string, userName: string) => void
}

export default function JoinRoomDialog({ onJoin }: JoinRoomDialogProps) {
  const [roomId, setRoomId] = useState("room-abc-123")
  const [userName, setUserName] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const initPreview = async () => {
      try {
        console.log("Initializing camera preview...")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        })
        console.log("Preview stream acquired:", stream.id, "active:", stream.active)
        setPreviewStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          const playPromise = videoRef.current.play()
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error("Preview video play failed:", error)
              // Retry after a short delay
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(console.error)
                }
              }, 100)
            })
          }
        }
      } catch (err) {
        console.error("Failed to get media:", err)
      }
    }
    initPreview()
    return () => {
      if (previewStream) {
        console.log("Cleaning up preview stream")
        previewStream.getTracks().forEach((track) => {
          console.log("Stopping track:", track.kind, track.id)
          track.stop()
        })
      }
    }
  }, [])

  // Handle video track enabling/disabling
  useEffect(() => {
    if (previewStream && videoRef.current) {
      const videoTrack = previewStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff
        console.log("Video track enabled state:", videoTrack.enabled)
      }
    }
  }, [isVideoOff, previewStream])

  const handleJoin = async () => {
    if (roomId.trim() && userName.trim()) {
      setIsJoining(true)
      try {
        await onJoin(roomId.trim(), userName.trim())
      } catch (err) {
        console.error("Failed to join:", err)
        setIsJoining(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Panel */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-50 text-xl font-semibold flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Camera Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden mb-4">
              {previewStream && !isVideoOff ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  onLoadedMetadata={(e) => {
                    const target = e.target as HTMLVideoElement
                    console.log("Preview video metadata loaded")
                    const playPromise = target.play()
                    if (playPromise !== undefined) {
                      playPromise.catch((error) => {
                        console.error("Preview video onLoadedMetadata play failed:", error)
                        setTimeout(() => {
                          target.play().catch(console.error)
                        }, 100)
                      })
                    }
                  }}
                  onCanPlay={(e) => {
                    const target = e.target as HTMLVideoElement
                    console.log("Preview video can play")
                    if (target.paused) {
                      target.play().catch(console.error)
                    }
                  }}
                  onError={(e) => {
                    console.error("Preview video error:", e)
                  }}
                  style={{ display: isVideoOff ? "none" : "block" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-semibold text-gray-300">
                        {userName ? userName.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                    <p className="text-gray-400">{isVideoOff ? "Camera is off" : "No camera access"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="h-12 w-12 rounded-full"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="sm"
                onClick={() => {
                  setIsVideoOff(!isVideoOff)
                  if (previewStream) {
                    const videoTrack = previewStream.getVideoTracks()[0]
                    if (videoTrack) {
                      videoTrack.enabled = isVideoOff // Toggle the track
                      console.log("Preview video track toggled:", videoTrack.enabled)
                    }
                  }
                }}
                className="h-12 w-12 rounded-full"
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
              <Button variant="secondary" size="sm" className="h-12 w-12 rounded-full">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Join Form */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50 rounded-2xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-gray-50 text-2xl font-bold">Join Meeting</CardTitle>
            <CardDescription className="text-gray-400 mt-2">Ready to connect? Enter your details below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomId" className="text-gray-300 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Room ID
              </Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="bg-gray-800/50 border-gray-600 text-gray-50 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName" className="text-gray-300">
                Display Name
              </Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="bg-gray-800/50 border-gray-600 text-gray-50 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 h-12"
              />
            </div>

            <div className="bg-gray-800/30 rounded-xl p-4 space-y-3">
              <h4 className="text-gray-300 font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Meeting Info
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Badge variant="secondary" className="bg-green-600/20 text-green-300 justify-center py-2">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure
                </Badge>
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 justify-center py-2">
                  <Users className="w-3 h-3 mr-1" />
                  HD Video
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleJoin}
              disabled={!roomId.trim() || !userName.trim() || isJoining}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Meeting"
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By joining, you agree to our terms of service and privacy policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
