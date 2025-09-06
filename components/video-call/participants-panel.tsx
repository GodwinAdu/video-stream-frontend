"use client"

import { useState } from "react"
import { X, Mic, MicOff, Video, VideoOff, Crown, Hand, MoreVertical, UserPlus, Users, UserX, Edit3, Shield, Volume2, VolumeX, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Participant } from "@/hooks/use-webrtc"

interface ParticipantsPanelProps {
    participants: Participant[]
    onClose: () => void
    localParticipantId?: string | null
    onMuteParticipant?: (participantId: string, mute: boolean) => void
    onToggleParticipantVideo?: (participantId: string, videoOff: boolean) => void
    onRemoveParticipant?: (participantId: string) => void
    onMakeHost?: (participantId: string) => void
    onRenameParticipant?: (participantId: string, newName: string) => void
    roomId?: string
}

export default function ParticipantsPanel({ 
    participants, 
    onClose, 
    localParticipantId,
    onMuteParticipant,
    onToggleParticipantVideo,
    onRemoveParticipant,
    onMakeHost,
    onRenameParticipant,
    roomId 
}: ParticipantsPanelProps) {
    const [editingName, setEditingName] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [removeDialog, setRemoveDialog] = useState<string | null>(null)
    const [inviteDialog, setInviteDialog] = useState(false)
    const [copied, setCopied] = useState(false)
    
    const isHost = participants.find(p => p.id === localParticipantId)?.isHost
    
    const copyInviteLink = async () => {
        if (roomId) {
            const inviteText = `Join my video meeting!\n\nRoom ID: ${roomId}\nLink: ${window.location.origin}\n\nClick the link and enter the Room ID to join.`
            await navigator.clipboard.writeText(inviteText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }
    
    const handleRename = (participantId: string) => {
        if (newName.trim() && onRenameParticipant) {
            onRenameParticipant(participantId, newName.trim())
            setEditingName(null)
            setNewName("")
        }
    }
    
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
                        <p className="text-xs text-gray-400">
                            {participants.length} {participants.length === 1 ? "person" : "people"} in meeting
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInviteDialog(true)}
                        className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl"
                    >
                        <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl"
                    >
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
                                                {participant.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        {participant.isRaiseHand && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
                                                <Hand className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div
                                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${participant.status === "online" ? "bg-green-500" : "bg-gray-500"
                                                }`}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            {editingName === participant.id ? (
                                                <Input
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleRename(participant.id)}
                                                    onBlur={() => handleRename(participant.id)}
                                                    className="h-6 text-sm bg-gray-700 border-gray-600"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-sm font-semibold text-gray-50 truncate">{participant.name}</span>
                                            )}
                                            {participant.isHost && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs px-2 py-0.5"
                                                >
                                                    <Crown className="w-3 h-3 mr-1" />
                                                    Host
                                                </Badge>
                                            )}
                                            {participant.id === localParticipantId && (
                                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-600 text-gray-400">
                                                    You
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

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-700/50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-48 bg-gray-800 border-gray-700">
                                        {/* Audio Controls */}
                                        {isHost && participant.id !== localParticipantId && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() => onMuteParticipant?.(participant.id, !participant.isMuted)}
                                                    className="text-gray-300 hover:bg-gray-700"
                                                >
                                                    {participant.isMuted ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                                                    {participant.isMuted ? 'Unmute' : 'Mute'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => onToggleParticipantVideo?.(participant.id, !participant.isVideoOff)}
                                                    className="text-gray-300 hover:bg-gray-700"
                                                >
                                                    {participant.isVideoOff ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                                                    {participant.isVideoOff ? 'Enable Video' : 'Disable Video'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-gray-700" />
                                            </>
                                        )}
                                        
                                        {/* Rename */}
                                        {(isHost || participant.id === localParticipantId) && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditingName(participant.id)
                                                    setNewName(participant.name)
                                                }}
                                                className="text-gray-300 hover:bg-gray-700"
                                            >
                                                <Edit3 className="w-4 h-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                        )}
                                        
                                        {/* Make Host */}
                                        {isHost && participant.id !== localParticipantId && !participant.isHost && (
                                            <DropdownMenuItem
                                                onClick={() => onMakeHost?.(participant.id)}
                                                className="text-gray-300 hover:bg-gray-700"
                                            >
                                                <Crown className="w-4 h-4 mr-2" />
                                                Make Host
                                            </DropdownMenuItem>
                                        )}
                                        
                                        {/* Remove Participant */}
                                        {isHost && participant.id !== localParticipantId && (
                                            <>
                                                <DropdownMenuSeparator className="bg-gray-700" />
                                                <DropdownMenuItem
                                                    onClick={() => setRemoveDialog(participant.id)}
                                                    className="text-red-400 hover:bg-red-900/20"
                                                >
                                                    <UserX className="w-4 h-4 mr-2" />
                                                    Remove from Meeting
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Modern Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
                <div className="space-y-3">
                    <Button 
                        onClick={() => setInviteDialog(true)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
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
                            <span>{participants.filter((p) => !p.isMuted).length} speaking</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Video className="w-3 h-3" />
                            <span>{participants.filter((p) => !p.isVideoOff).length} video on</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Invite Dialog */}
            <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
                <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                        <DialogTitle className="text-gray-50">Invite People</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-300 mb-2 block">Room ID</label>
                            <div className="flex space-x-2">
                                <Input
                                    value={roomId || ''}
                                    readOnly
                                    className="bg-gray-800 border-gray-600 text-gray-50"
                                />
                                <Button
                                    onClick={copyInviteLink}
                                    variant="outline"
                                    className="border-gray-600"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            Share this Room ID with others to invite them to the meeting.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setInviteDialog(false)} variant="outline" className="border-gray-600">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Remove Confirmation Dialog */}
            <AlertDialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
                <AlertDialogContent className="bg-gray-900 border-gray-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-50">Remove Participant</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to remove this participant from the meeting? They will be disconnected immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (removeDialog) {
                                    onRemoveParticipant?.(removeDialog)
                                    setRemoveDialog(null)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
