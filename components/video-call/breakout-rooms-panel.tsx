"use client"

import { useState, useEffect } from "react"
import { X, Users, Plus, Shuffle, Timer, Play, Square, UserPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Participant {
    id: string
    name: string
    isHost: boolean
}

interface BreakoutRoom {
    id: string
    name: string
    participants: string[]
}

interface BreakoutRoomsPanelProps {
    onClose: () => void
    participants: Participant[]
    localParticipantId: string | null
    isHost: boolean
    signalingRef: any
}

export default function BreakoutRoomsPanel({
    onClose,
    participants,
    localParticipantId,
    isHost,
    signalingRef,
}: BreakoutRoomsPanelProps) {
    const [rooms, setRooms] = useState<BreakoutRoom[]>([])
    const [numRooms, setNumRooms] = useState(2)
    const [assignmentMode, setAssignmentMode] = useState<"auto" | "manual">("auto")
    const [duration, setDuration] = useState(10)
    const [isActive, setIsActive] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(0)
    const [unassignedParticipants, setUnassignedParticipants] = useState<string[]>([])

    useEffect(() => {
        // Initialize unassigned participants (exclude host)
        const unassigned = participants
            .filter(p => !p.isHost && p.id !== localParticipantId)
            .map(p => p.id)
        setUnassignedParticipants(unassigned)
    }, [participants, localParticipantId])

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("breakout-rooms-created", ({ rooms: newRooms }: { rooms: BreakoutRoom[] }) => {
            setRooms(newRooms)
            setIsActive(true)
        })

        socket.on("breakout-rooms-started", ({ duration: dur }: { duration: number }) => {
            setTimeRemaining(dur * 60)
        })

        socket.on("breakout-rooms-ended", () => {
            setIsActive(false)
            setTimeRemaining(0)
        })

        socket.on("assigned-to-breakout-room", ({ roomId }: { roomId: string }) => {
            console.log("Assigned to breakout room:", roomId)
        })

        return () => {
            socket.off("breakout-rooms-created")
            socket.off("breakout-rooms-started")
            socket.off("breakout-rooms-ended")
            socket.off("assigned-to-breakout-room")
        }
    }, [signalingRef])

    useEffect(() => {
        if (timeRemaining > 0 && isActive) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleEndBreakoutRooms()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [timeRemaining, isActive])

    const createRooms = () => {
        const newRooms: BreakoutRoom[] = []
        for (let i = 0; i < numRooms; i++) {
            newRooms.push({
                id: `room-${i + 1}`,
                name: `Room ${i + 1}`,
                participants: [],
            })
        }

        if (assignmentMode === "auto") {
            // Auto-assign participants
            const participantsToAssign = [...unassignedParticipants]
            participantsToAssign.forEach((participantId, index) => {
                const roomIndex = index % numRooms
                newRooms[roomIndex].participants.push(participantId)
            })
            setUnassignedParticipants([])
        }

        setRooms(newRooms)
    }

    const shuffleParticipants = () => {
        const allParticipants = [
            ...unassignedParticipants,
            ...rooms.flatMap(r => r.participants),
        ]
        const shuffled = [...allParticipants].sort(() => Math.random() - 0.5)

        const newRooms = rooms.map((room, index) => ({
            ...room,
            participants: [],
        }))

        shuffled.forEach((participantId, index) => {
            const roomIndex = index % rooms.length
            newRooms[roomIndex].participants.push(participantId)
        })

        setRooms(newRooms)
        setUnassignedParticipants([])
    }

    const assignToRoom = (participantId: string, roomId: string) => {
        setRooms(prev =>
            prev.map(room => {
                if (room.id === roomId) {
                    return { ...room, participants: [...room.participants, participantId] }
                }
                return { ...room, participants: room.participants.filter(p => p !== participantId) }
            })
        )
        setUnassignedParticipants(prev => prev.filter(p => p !== participantId))
    }

    const removeFromRoom = (participantId: string, roomId: string) => {
        setRooms(prev =>
            prev.map(room => {
                if (room.id === roomId) {
                    return { ...room, participants: room.participants.filter(p => p !== participantId) }
                }
                return room
            })
        )
        setUnassignedParticipants(prev => [...prev, participantId])
    }

    const handleStartBreakoutRooms = () => {
        if (signalingRef.current) {
            signalingRef.current.emit("start-breakout-rooms", { rooms, duration })
            setIsActive(true)
            setTimeRemaining(duration * 60)
        }
    }

    const handleEndBreakoutRooms = () => {
        if (signalingRef.current) {
            signalingRef.current.emit("end-breakout-rooms")
            setIsActive(false)
            setTimeRemaining(0)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getParticipantName = (participantId: string) => {
        return participants.find(p => p.id === participantId)?.name || "Unknown"
    }

    if (!isHost) {
        return (
            <div className="h-full flex flex-col bg-gray-900 text-gray-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold">Breakout Rooms</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <Alert>
                        <AlertDescription>
                            {isActive
                                ? "You are in the main room. The host will assign you to a breakout room."
                                : "Breakout rooms are not active. The host can create them."}
                        </AlertDescription>
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
                    <Users className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Breakout Rooms</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Timer */}
                    {isActive && (
                        <Alert className="bg-blue-500/10 border-blue-500">
                            <Timer className="w-4 h-4" />
                            <AlertDescription className="flex items-center justify-between">
                                <span>Breakout rooms active</span>
                                <Badge variant="secondary" className="text-lg font-mono">
                                    {formatTime(timeRemaining)}
                                </Badge>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Setup */}
                    {!isActive && rooms.length === 0 && (
                        <div className="space-y-4">
                            <div>
                                <Label>Number of Rooms</Label>
                                <Select value={numRooms.toString()} onValueChange={v => setNumRooms(parseInt(v))}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                            <SelectItem key={n} value={n.toString()}>
                                                {n} rooms
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Assignment</Label>
                                <Select value={assignmentMode} onValueChange={v => setAssignmentMode(v as any)}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Automatically</SelectItem>
                                        <SelectItem value="manual">Manually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Duration (minutes)</Label>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value) || 10)}
                                    className="bg-gray-800 border-gray-700"
                                    min={1}
                                    max={60}
                                />
                            </div>

                            <Button onClick={createRooms} className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Rooms
                            </Button>
                        </div>
                    )}

                    {/* Rooms List */}
                    {rooms.length > 0 && !isActive && (
                        <div className="space-y-4">
                            <div className="flex space-x-2">
                                <Button onClick={shuffleParticipants} variant="outline" className="flex-1">
                                    <Shuffle className="w-4 h-4 mr-2" />
                                    Shuffle
                                </Button>
                                <Button onClick={handleStartBreakoutRooms} className="flex-1">
                                    <Play className="w-4 h-4 mr-2" />
                                    Start
                                </Button>
                            </div>

                            <Separator />

                            {/* Unassigned */}
                            {unassignedParticipants.length > 0 && (
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <h3 className="text-sm font-medium mb-2">Unassigned ({unassignedParticipants.length})</h3>
                                    <div className="space-y-1">
                                        {unassignedParticipants.map(participantId => (
                                            <div key={participantId} className="flex items-center justify-between text-sm">
                                                <span>{getParticipantName(participantId)}</span>
                                                <Select onValueChange={roomId => assignToRoom(participantId, roomId)}>
                                                    <SelectTrigger className="w-24 h-7 text-xs">
                                                        <SelectValue placeholder="Assign" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {rooms.map(room => (
                                                            <SelectItem key={room.id} value={room.id}>
                                                                {room.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rooms */}
                            {rooms.map(room => (
                                <div key={room.id} className="bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium">{room.name}</h3>
                                        <Badge variant="secondary">{room.participants.length}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        {room.participants.map(participantId => (
                                            <div key={participantId} className="flex items-center justify-between text-sm">
                                                <span>{getParticipantName(participantId)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFromRoom(participantId, room.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        {room.participants.length === 0 && (
                                            <p className="text-xs text-gray-500">No participants assigned</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Rooms */}
                    {isActive && (
                        <div className="space-y-4">
                            <Button onClick={handleEndBreakoutRooms} variant="destructive" className="w-full">
                                <Square className="w-4 h-4 mr-2" />
                                End Breakout Rooms
                            </Button>

                            <Separator />

                            {rooms.map(room => (
                                <div key={room.id} className="bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium">{room.name}</h3>
                                        <Badge variant="secondary">{room.participants.length}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        {room.participants.map(participantId => (
                                            <div key={participantId} className="text-sm text-gray-300">
                                                {getParticipantName(participantId)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
