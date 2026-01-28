"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Video, Mic, MicOff, VideoOff, Settings, Users, Clock, Shield, Loader2, Plus, Copy, Check } from "lucide-react"
import AuthModal from "../auth/auth-modal"
import { getAuth } from "@/lib/auth"

interface JoinRoomDialogProps {
  onJoin: (roomId: string, userName: string) => void
  initialRoomId?: string
}

export default function JoinRoomDialog({ onJoin, initialRoomId }: JoinRoomDialogProps) {
  const [roomId, setRoomId] = useState(initialRoomId || "")
  const [userName, setUserName] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [meetingStatus, setMeetingStatus] = useState<{status: string, message?: string} | null>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<"create" | "join">("create")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [usePersonalRoom, setUsePersonalRoom] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const auth = getAuth()
    if (auth) {
      setUserName(auth.user.name)
      setIsAuthenticated(true)
      setCurrentUser(auth.user)
    }
  }, [])

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'room-'
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const usePersonalMeetingRoom = () => {
    if (currentUser?.personalRoomId) {
      setRoomId(currentUser.personalRoomId)
      setUsePersonalRoom(true)
    }
  }

  const copyRoomId = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
      setMeetingStatus(null)
      
      // Check meeting status first
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/meetings/check/${roomId.trim()}`)
        if (response.ok) {
          const { meeting } = await response.json()
          if (meeting.status === 'upcoming') {
            const meetingTime = new Date(meeting.scheduledTime)
            const timeUntil = Math.ceil((meetingTime.getTime() - Date.now()) / (1000 * 60))
            setIsJoining(false)
            setMeetingStatus({ 
              status: 'waiting', 
              message: `Meeting hasn't started yet. Scheduled for ${meetingTime.toLocaleString()}. Please wait ${timeUntil} minute${timeUntil !== 1 ? 's' : ''}.` 
            })
            return
          } else if (meeting.status === 'ended') {
            setIsJoining(false)
            setMeetingStatus({ status: 'ended', message: 'This meeting has already ended.' })
            return
          }
        }
      } catch (err) {
        // If meeting check fails, continue (might be instant meeting)
      }
      
      try {
        await onJoin(roomId.trim(), userName.trim())
      } catch (err: any) {
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

        {/* Room Management */}
        <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50 rounded-2xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-gray-50 text-2xl font-bold">Video Meeting</CardTitle>
            <CardDescription className="text-gray-400 mt-2">Create a new room or join an existing one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={initialRoomId ? "join" : "create"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
                <TabsTrigger value="create" className="data-[state=active]:bg-blue-600">Create Room</TabsTrigger>
                <TabsTrigger value="join" className="data-[state=active]:bg-blue-600">Join Room</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-gray-300">Your Name</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-gray-800/50 border-gray-600 text-gray-50 h-12"
                  />
                </div>

                {/* Personal Meeting Room Option */}
                {currentUser?.personalRoomId && (
                  <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-blue-300">Personal Meeting Room</h4>
                        <p className="text-xs text-blue-400/70">Your permanent meeting room</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={usePersonalMeetingRoom}
                        className="border-blue-500/50 text-blue-300 hover:bg-blue-600/20"
                      >
                        Use PMR
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <code className="bg-gray-800/50 px-2 py-1 rounded text-blue-300 text-xs">
                        {currentUser.personalRoomId}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser.personalRoomId)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthMode("create")
                      setShowAuth(true)
                    } else {
                      const newRoomId = generateRoomId()
                      setRoomId(newRoomId)
                      setUsePersonalRoom(false)
                    }
                  }}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 h-12"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isAuthenticated ? "Generate New Room ID" : "Sign in to Create Room"}
                </Button>
                
                {roomId && (
                  <div className="bg-gray-800/30 rounded-xl p-4 space-y-3">
                    <Label className="text-gray-300">
                      {usePersonalRoom ? 'Personal Meeting Room ID' : 'Room ID (Share with others)'}
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        value={roomId}
                        readOnly
                        className="bg-gray-700/50 border-gray-600 text-gray-50 h-10"
                      />
                      <Button
                        onClick={copyRoomId}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 h-10 w-10 p-0"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {usePersonalRoom && (
                      <p className="text-xs text-blue-400">
                        💡 This is your permanent room - same ID every time you create a meeting
                      </p>
                    )}
                  </div>
                )}
                
                {meetingStatus?.status === 'waiting' ? (
                  <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                    <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <h4 className="font-medium text-yellow-300 mb-2">Meeting Not Started</h4>
                    <p className="text-sm text-yellow-200">{meetingStatus.message}</p>
                    <Button
                      onClick={() => setMeetingStatus(null)}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/20"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoin}
                    disabled={!roomId.trim() || !userName.trim() || isJoining}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-lg rounded-xl"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create & Join Room"
                    )}
                  </Button>
                )}
              </TabsContent>
              
              <TabsContent value="join" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-gray-300">Room ID</Label>
                  <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="bg-gray-800/50 border-gray-600 text-gray-50 h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-300">Your Name</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-gray-800/50 border-gray-600 text-gray-50 h-12"
                  />
                </div>
                
                {meetingStatus?.status === 'waiting' ? (
                  <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                    <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <h4 className="font-medium text-yellow-300 mb-2">Meeting Not Started</h4>
                    <p className="text-sm text-yellow-200">{meetingStatus.message}</p>
                    <Button
                      onClick={() => setMeetingStatus(null)}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/20"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoin}
                    disabled={!roomId.trim() || !userName.trim() || isJoining}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg rounded-xl"
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
                )}
              </TabsContent>
            </Tabs>
            
            <div className="bg-gray-800/30 rounded-xl p-4 mt-6">
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
          </CardContent>
        </Card>
      </div>

      {showAuth && (
        <AuthModal
          mode={authMode}
          onSuccess={(name) => {
            setUserName(name)
            setIsAuthenticated(authMode === "create")
            setShowAuth(false)
            // Refresh auth state to get personal room ID
            const auth = getAuth()
            if (auth) {
              setCurrentUser(auth.user)
            }
            if (authMode === "create") {
              const newRoomId = generateRoomId()
              setRoomId(newRoomId)
            }
          }}
        />
      )}
    </div>
  )
}
