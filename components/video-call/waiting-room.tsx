"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Shield, Loader2 } from "lucide-react"

interface WaitingRoomProps {
  roomId: string
  userName: string
  hostName: string
  onAdmit: () => void
  onReject: () => void
}

export default function WaitingRoom({ roomId, userName, hostName, onAdmit, onReject }: WaitingRoomProps) {
  const [waitTime, setWaitTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <CardTitle className="text-white text-xl">Waiting for Host</CardTitle>
          <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 mx-auto">
            Waiting Room Enabled
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-300">
              <strong>{hostName}</strong> will admit you shortly
            </p>
            <p className="text-sm text-slate-400">
              Please wait while the host reviews your request to join
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Meeting ID:</span>
              <code className="text-blue-400 font-mono">{roomId}</code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Your Name:</span>
              <span className="text-white">{userName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Wait Time:</span>
              <div className="flex items-center text-yellow-400">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(waitTime)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Waiting for admission...</span>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={onReject}
            >
              Leave Waiting Room
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500">
              The host has enabled the waiting room for security. 
              You'll be admitted once approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}