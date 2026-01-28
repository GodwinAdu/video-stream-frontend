"use client"

import { useState, useEffect } from "react"
import { X, Lock, Unlock, Shield, UserX, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface SecurityPanelProps {
    onClose: () => void
    signalingRef: any
    isHost: boolean
    roomId: string
}

export default function SecurityPanel({ onClose, signalingRef, isHost, roomId }: SecurityPanelProps) {
    const [isLocked, setIsLocked] = useState(false)
    const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false)
    const [screenShareRestricted, setScreenShareRestricted] = useState(false)
    const [chatRestricted, setChatRestricted] = useState(false)

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("meeting-locked", ({ locked }: { locked: boolean }) => {
            setIsLocked(locked)
        })

        socket.on("waiting-room-toggled", ({ enabled }: { enabled: boolean }) => {
            setWaitingRoomEnabled(enabled)
        })

        socket.on("screen-share-restricted", ({ restricted }: { restricted: boolean }) => {
            setScreenShareRestricted(restricted)
        })

        socket.on("chat-restricted", ({ restricted }: { restricted: boolean }) => {
            setChatRestricted(restricted)
        })

        return () => {
            socket.off("meeting-locked")
            socket.off("waiting-room-toggled")
            socket.off("screen-share-restricted")
            socket.off("chat-restricted")
        }
    }, [signalingRef])

    const toggleMeetingLock = () => {
        if (!isHost || !signalingRef.current) return

        const newLockState = !isLocked
        signalingRef.current.emit("toggle-meeting-lock", { locked: newLockState })
        setIsLocked(newLockState)
    }

    const toggleWaitingRoom = () => {
        if (!isHost || !signalingRef.current) return

        const newState = !waitingRoomEnabled
        signalingRef.current.emit("toggle-waiting-room", { enabled: newState })
        setWaitingRoomEnabled(newState)
    }

    const toggleScreenShareRestriction = () => {
        if (!isHost || !signalingRef.current) return

        const newState = !screenShareRestricted
        signalingRef.current.emit("toggle-screen-share-restriction", { restricted: newState })
        setScreenShareRestricted(newState)
    }

    const toggleChatRestriction = () => {
        if (!isHost || !signalingRef.current) return

        const newState = !chatRestricted
        signalingRef.current.emit("toggle-chat-restriction", { restricted: newState })
        setChatRestricted(newState)
    }

    if (!isHost) {
        return (
            <div className="h-full flex flex-col bg-gray-900 text-gray-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold">Security</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <Alert>
                        <Shield className="w-4 h-4" />
                        <AlertDescription>Only the host can manage security settings.</AlertDescription>
                    </Alert>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Security</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {/* Meeting Lock */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {isLocked ? (
                                <Lock className="w-5 h-5 text-red-400" />
                            ) : (
                                <Unlock className="w-5 h-5 text-green-400" />
                            )}
                            <div>
                                <Label className="text-base">Lock Meeting</Label>
                                <p className="text-xs text-gray-400">Prevent new participants from joining</p>
                            </div>
                        </div>
                        <Switch checked={isLocked} onCheckedChange={toggleMeetingLock} />
                    </div>

                    {isLocked && (
                        <Alert className="bg-red-500/10 border-red-500">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription className="text-red-400">
                                Meeting is locked. No one can join until you unlock it.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <Separator />

                {/* Waiting Room */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-base">Waiting Room</Label>
                        <p className="text-xs text-gray-400">Admit participants before they join</p>
                    </div>
                    <Switch checked={waitingRoomEnabled} onCheckedChange={toggleWaitingRoom} />
                </div>

                <Separator />

                {/* Screen Share Restriction */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-base">Restrict Screen Sharing</Label>
                        <p className="text-xs text-gray-400">Only host can share screen</p>
                    </div>
                    <Switch checked={screenShareRestricted} onCheckedChange={toggleScreenShareRestriction} />
                </div>

                <Separator />

                {/* Chat Restriction */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-base">Restrict Chat</Label>
                        <p className="text-xs text-gray-400">Only host can send messages</p>
                    </div>
                    <Switch checked={chatRestricted} onCheckedChange={toggleChatRestriction} />
                </div>

                <Separator />

                {/* Security Info */}
                <Alert className="bg-blue-500/10 border-blue-500">
                    <Shield className="w-4 h-4" />
                    <AlertDescription className="text-blue-400">
                        <strong>Security Tips:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                            <li>Lock meeting after all participants join</li>
                            <li>Use waiting room for sensitive meetings</li>
                            <li>Remove disruptive participants immediately</li>
                            <li>Enable screen share restriction for large meetings</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    )
}
