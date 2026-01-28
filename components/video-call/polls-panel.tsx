"use client"

import { useState, useEffect } from "react"
import { X, Plus, BarChart3, CheckCircle, Circle, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

interface Poll {
    id: string
    question: string
    options: string[]
    votes: Record<string, string> // participantId -> optionIndex
    createdBy: string
    createdAt: string
    isActive: boolean
}

interface PollsPanelProps {
    onClose: () => void
    localParticipantId: string | null
    isHost: boolean
    signalingRef: any
    participants: any[]
}

export default function PollsPanel({
    onClose,
    localParticipantId,
    isHost,
    signalingRef,
    participants,
}: PollsPanelProps) {
    const [polls, setPolls] = useState<Poll[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [newQuestion, setNewQuestion] = useState("")
    const [newOptions, setNewOptions] = useState(["", ""])
    const [activePoll, setActivePoll] = useState<Poll | null>(null)
    const [myVote, setMyVote] = useState<string | null>(null)

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("poll-created", ({ poll }: { poll: Poll }) => {
            setPolls(prev => [...prev, poll])
            setActivePoll(poll)
        })

        socket.on("poll-vote", ({ pollId, participantId, optionIndex }: any) => {
            setPolls(prev =>
                prev.map(poll => {
                    if (poll.id === pollId) {
                        return {
                            ...poll,
                            votes: { ...poll.votes, [participantId]: optionIndex },
                        }
                    }
                    return poll
                })
            )
            if (activePoll?.id === pollId) {
                setActivePoll(prev =>
                    prev
                        ? {
                              ...prev,
                              votes: { ...prev.votes, [participantId]: optionIndex },
                          }
                        : null
                )
            }
        })

        socket.on("poll-ended", ({ pollId }: { pollId: string }) => {
            setPolls(prev =>
                prev.map(poll => {
                    if (poll.id === pollId) {
                        return { ...poll, isActive: false }
                    }
                    return poll
                })
            )
            if (activePoll?.id === pollId) {
                setActivePoll(prev => (prev ? { ...prev, isActive: false } : null))
            }
        })

        return () => {
            socket.off("poll-created")
            socket.off("poll-vote")
            socket.off("poll-ended")
        }
    }, [signalingRef, activePoll])

    const addOption = () => {
        if (newOptions.length < 10) {
            setNewOptions([...newOptions, ""])
        }
    }

    const removeOption = (index: number) => {
        if (newOptions.length > 2) {
            setNewOptions(newOptions.filter((_, i) => i !== index))
        }
    }

    const updateOption = (index: number, value: string) => {
        const updated = [...newOptions]
        updated[index] = value
        setNewOptions(updated)
    }

    const createPoll = () => {
        if (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) {
            return
        }

        const poll: Poll = {
            id: `poll-${Date.now()}`,
            question: newQuestion,
            options: newOptions.filter(o => o.trim()),
            votes: {},
            createdBy: localParticipantId || "",
            createdAt: new Date().toISOString(),
            isActive: true,
        }

        if (signalingRef.current) {
            signalingRef.current.emit("create-poll", { poll })
        }

        setNewQuestion("")
        setNewOptions(["", ""])
        setIsCreating(false)
    }

    const vote = (optionIndex: string) => {
        if (!activePoll || !localParticipantId) return

        if (signalingRef.current) {
            signalingRef.current.emit("vote-poll", {
                pollId: activePoll.id,
                participantId: localParticipantId,
                optionIndex,
            })
            setMyVote(optionIndex)
        }
    }

    const endPoll = (pollId: string) => {
        if (signalingRef.current) {
            signalingRef.current.emit("end-poll", { pollId })
        }
    }

    const getResults = (poll: Poll) => {
        const totalVotes = Object.keys(poll.votes).length
        return poll.options.map((option, index) => {
            const votes = Object.values(poll.votes).filter(v => v === index.toString()).length
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0
            return { option, votes, percentage }
        })
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Polls</h2>
                </div>
                <div className="flex items-center space-x-2">
                    {isHost && !isCreating && (
                        <Button size="sm" onClick={() => setIsCreating(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            New Poll
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Create Poll */}
                    {isCreating && (
                        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                            <h3 className="font-medium">Create New Poll</h3>

                            <div>
                                <Label>Question</Label>
                                <Textarea
                                    value={newQuestion}
                                    onChange={e => setNewQuestion(e.target.value)}
                                    placeholder="Enter your question..."
                                    className="bg-gray-900 border-gray-700"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <Label>Options</Label>
                                <div className="space-y-2 mt-2">
                                    {newOptions.map((option, index) => (
                                        <div key={index} className="flex space-x-2">
                                            <Input
                                                value={option}
                                                onChange={e => updateOption(index, e.target.value)}
                                                placeholder={`Option ${index + 1}`}
                                                className="bg-gray-900 border-gray-700"
                                            />
                                            {newOptions.length > 2 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeOption(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {newOptions.length < 10 && (
                                    <Button variant="outline" size="sm" onClick={addOption} className="mt-2">
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Option
                                    </Button>
                                )}
                            </div>

                            <div className="flex space-x-2">
                                <Button onClick={createPoll} className="flex-1">
                                    <Send className="w-4 h-4 mr-2" />
                                    Launch Poll
                                </Button>
                                <Button variant="outline" onClick={() => setIsCreating(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Active Poll */}
                    {activePoll && activePoll.isActive && (
                        <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <Badge className="mb-2">Active Poll</Badge>
                                    <h3 className="font-medium">{activePoll.question}</h3>
                                </div>
                                {isHost && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => endPoll(activePoll.id)}
                                    >
                                        End Poll
                                    </Button>
                                )}
                            </div>

                            {!myVote ? (
                                <RadioGroup onValueChange={vote}>
                                    {activePoll.options.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                            <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-400">
                                        {Object.keys(activePoll.votes).length} vote(s) received
                                    </p>
                                    {activePoll.options.map((option, index) => {
                                        const isMyVote = myVote === index.toString()
                                        return (
                                            <div key={index} className="flex items-center space-x-2">
                                                {isMyVote ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-gray-600" />
                                                )}
                                                <span className={isMyVote ? "text-green-400" : ""}>{option}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Poll History */}
                    {polls.length > 0 && (
                        <>
                            <Separator />
                            <h3 className="font-medium">Poll History</h3>
                            {polls
                                .filter(poll => !poll.isActive)
                                .reverse()
                                .map(poll => {
                                    const results = getResults(poll)
                                    const totalVotes = Object.keys(poll.votes).length

                                    return (
                                        <div key={poll.id} className="bg-gray-800 rounded-lg p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-medium">{poll.question}</h4>
                                                <Badge variant="secondary">{totalVotes} votes</Badge>
                                            </div>

                                            <div className="space-y-2">
                                                {results.map((result, index) => (
                                                    <div key={index} className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>{result.option}</span>
                                                            <span className="text-gray-400">
                                                                {result.votes} ({result.percentage.toFixed(0)}%)
                                                            </span>
                                                        </div>
                                                        <Progress value={result.percentage} className="h-2" />
                                                    </div>
                                                ))}
                                            </div>

                                            <p className="text-xs text-gray-500">
                                                {new Date(poll.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )
                                })}
                        </>
                    )}

                    {polls.length === 0 && !isCreating && (
                        <div className="text-center py-12 text-gray-500">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No polls yet</p>
                            {isHost && <p className="text-sm mt-2">Create a poll to get started</p>}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
