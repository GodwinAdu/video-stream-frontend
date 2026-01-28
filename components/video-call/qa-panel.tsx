"use client"

import { useState, useEffect } from "react"
import { X, Send, ThumbsUp, CheckCircle, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Question {
    id: string
    question: string
    askedBy: string
    askedAt: string
    upvotes: string[]
    answer?: string
    answeredBy?: string
    answeredAt?: string
    isAnswered: boolean
}

interface QAPanelProps {
    onClose: () => void
    signalingRef: any
    localParticipantId: string | null
    isHost: boolean
    participants: any[]
}

export default function QAPanel({ onClose, signalingRef, localParticipantId, isHost, participants }: QAPanelProps) {
    const [questions, setQuestions] = useState<Question[]>([])
    const [newQuestion, setNewQuestion] = useState("")
    const [answerText, setAnswerText] = useState<Record<string, string>>({})

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("question-asked", ({ question }: { question: Question }) => {
            setQuestions(prev => [...prev, question])
        })

        socket.on("question-upvoted", ({ questionId, participantId }: any) => {
            setQuestions(prev =>
                prev.map(q => {
                    if (q.id === questionId) {
                        const upvotes = q.upvotes.includes(participantId)
                            ? q.upvotes.filter(id => id !== participantId)
                            : [...q.upvotes, participantId]
                        return { ...q, upvotes }
                    }
                    return q
                })
            )
        })

        socket.on("question-answered", ({ questionId, answer, answeredBy }: any) => {
            setQuestions(prev =>
                prev.map(q => {
                    if (q.id === questionId) {
                        return {
                            ...q,
                            answer,
                            answeredBy,
                            answeredAt: new Date().toISOString(),
                            isAnswered: true,
                        }
                    }
                    return q
                })
            )
        })

        return () => {
            socket.off("question-asked")
            socket.off("question-upvoted")
            socket.off("question-answered")
        }
    }, [signalingRef])

    const askQuestion = () => {
        if (!newQuestion.trim() || !localParticipantId) return

        const question: Question = {
            id: `q-${Date.now()}`,
            question: newQuestion,
            askedBy: localParticipantId,
            askedAt: new Date().toISOString(),
            upvotes: [],
            isAnswered: false,
        }

        if (signalingRef.current) {
            signalingRef.current.emit("ask-question", { question })
        }

        setQuestions(prev => [...prev, question])
        setNewQuestion("")
    }

    const upvoteQuestion = (questionId: string) => {
        if (!localParticipantId) return

        if (signalingRef.current) {
            signalingRef.current.emit("upvote-question", { questionId, participantId: localParticipantId })
        }

        setQuestions(prev =>
            prev.map(q => {
                if (q.id === questionId) {
                    const upvotes = q.upvotes.includes(localParticipantId)
                        ? q.upvotes.filter(id => id !== localParticipantId)
                        : [...q.upvotes, localParticipantId]
                    return { ...q, upvotes }
                }
                return q
            })
        )
    }

    const answerQuestion = (questionId: string) => {
        const answer = answerText[questionId]
        if (!answer?.trim() || !localParticipantId) return

        if (signalingRef.current) {
            signalingRef.current.emit("answer-question", {
                questionId,
                answer,
                answeredBy: localParticipantId,
            })
        }

        setQuestions(prev =>
            prev.map(q => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        answer,
                        answeredBy: localParticipantId,
                        answeredAt: new Date().toISOString(),
                        isAnswered: true,
                    }
                }
                return q
            })
        )

        setAnswerText(prev => {
            const newAnswers = { ...prev }
            delete newAnswers[questionId]
            return newAnswers
        })
    }

    const getParticipantName = (participantId: string) => {
        if (participantId === localParticipantId) return "You"
        return participants.find(p => p.id === participantId)?.name || "Unknown"
    }

    const sortedQuestions = [...questions].sort((a, b) => {
        // Unanswered first, then by upvotes, then by time
        if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1
        if (a.upvotes.length !== b.upvotes.length) return b.upvotes.length - a.upvotes.length
        return new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
    })

    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Q&A</h2>
                    <Badge variant="secondary">{questions.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Ask Question */}
            <div className="p-4 border-b border-gray-700 space-y-2">
                <Textarea
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="bg-gray-800 border-gray-700 resize-none"
                    rows={3}
                />
                <Button onClick={askQuestion} disabled={!newQuestion.trim()} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Ask Question
                </Button>
            </div>

            {/* Questions List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {sortedQuestions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No questions yet</p>
                            <p className="text-sm mt-2">Be the first to ask a question</p>
                        </div>
                    ) : (
                        sortedQuestions.map(q => (
                            <div
                                key={q.id}
                                className={`bg-gray-800 rounded-lg p-4 space-y-3 ${
                                    q.isAnswered ? "border-l-4 border-green-500" : ""
                                }`}
                            >
                                {/* Question */}
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{q.question}</p>
                                            <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                                                <span>{getParticipantName(q.askedBy)}</span>
                                                <span>•</span>
                                                <span>{new Date(q.askedAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        {q.isAnswered && (
                                            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Answered
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Upvote */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => upvoteQuestion(q.id)}
                                        className={`h-8 ${
                                            q.upvotes.includes(localParticipantId || "")
                                                ? "text-blue-400"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        <ThumbsUp className="w-4 h-4 mr-1" />
                                        {q.upvotes.length}
                                    </Button>
                                </div>

                                {/* Answer */}
                                {q.isAnswered && q.answer && (
                                    <>
                                        <Separator />
                                        <div className="bg-gray-900 rounded p-3 space-y-1">
                                            <p className="text-sm">{q.answer}</p>
                                            <p className="text-xs text-gray-500">
                                                Answered by {getParticipantName(q.answeredBy || "")} •{" "}
                                                {new Date(q.answeredAt || "").toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Answer Input (Host Only) */}
                                {isHost && !q.isAnswered && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Textarea
                                                value={answerText[q.id] || ""}
                                                onChange={e =>
                                                    setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))
                                                }
                                                placeholder="Type your answer..."
                                                className="bg-gray-900 border-gray-700 resize-none text-sm"
                                                rows={2}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => answerQuestion(q.id)}
                                                disabled={!answerText[q.id]?.trim()}
                                            >
                                                <Send className="w-3 h-3 mr-1" />
                                                Answer
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer Stats */}
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{questions.filter(q => !q.isAnswered).length} unanswered</span>
                    <span>{questions.filter(q => q.isAnswered).length} answered</span>
                </div>
            </div>
        </div>
    )
}
