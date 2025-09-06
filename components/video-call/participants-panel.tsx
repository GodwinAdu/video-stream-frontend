"use client"

import { X, Mic, MicOff, Video, VideoOff, Crown, Hand, MoreVertical, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Participant } from "@/hooks/use-webrtc" // Import Participant type

interface ParticipantsPanelProps {
    participants: Participant[] // Now uses the Participant type from use-webrtc
    onClose: () => void
}

export default function ParticipantsPanel({ participants, onClose }: ParticipantsPanelProps) {
    return (
        <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
            {/* Modern Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-green-600/10 to-blue-600/10 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-50 text-lg">Participants</h3>
                        <p className="text-xs text-gray-400">{participants.length} {participants.length === 1 ? 'person' : 'people'} in meeting</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl">
                        <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Enhanced Participants List */}
            <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6 space-y-3">
                    {participants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-gray-500" />
                            </div>
                            <h4 className="text-gray-300 font-medium mb-2">No participants yet</h4>
                            <p className="text-gray-500 text-sm">Invite people to join the meeting</p>
                        </div>
                    ) : (
                        participants.map((participant) => (
                            <div
                                key={participant.id}
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-800/30 hover:bg-gray-800/60 transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm"
                            >
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="relative">
                                        <Avatar className="w-12 h-12 border-2 border-gray-600 group-hover:border-gray-500 transition-colors">
                                            <AvatarImage src={participant.avatar || "/placeholder.svg?height=48&width=48"} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                                                {participant.name.split(" ").map(n => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        {participant.isRaiseHand && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
                                                <Hand className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                                            participant.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                                        }`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-50 truncate">{participant.name}</span>
                                            {participant.isHost && (
                                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs px-2 py-0.5">
                                                    <Crown className="w-3 h-3 mr-1" />
                                                    Host
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center space-x-1">
                                                {participant.isMuted ? (
                                                    <div className="flex items-center space-x-1 text-red-400">
                                                        <MicOff className="w-3 h-3" />
                                                        <span className="text-xs">Muted</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1 text-green-400">
                                                        <Mic className="w-3 h-3" />
                                                        <span className="text-xs">Speaking</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-1 h-1 bg-gray-600 rounded-full" />
                                            <div className="flex items-center space-x-1">
                                                {participant.isVideoOff ? (
                                                    <div className="flex items-center space-x-1 text-red-400">
                                                        <VideoOff className="w-3 h-3" />
                                                        <span className="text-xs">Camera off</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1 text-green-400">
                                                        <Video className="w-3 h-3" />
                                                        <span className="text-xs">Camera on</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-700/50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Modern Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
                <div className="space-y-3">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite People
                    </Button>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>Online</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Mic className="w-3 h-3" />
                            <span>{participants.filter(p => !p.isMuted).length} speaking</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Video className="w-3 h-3" />
                            <span>{participants.filter(p => !p.isVideoOff).length} video on</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
