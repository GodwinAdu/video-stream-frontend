"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { X, Send, Smile, Paperclip, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Socket } from "socket.io-client"
// import { useWebRTC } from "@/hooks/use-webrtc" // Import useWebRTC to access socket for chat messages

interface ChatMessage {
  id: string
  senderId: string
  userName: string
  content: string
  timestamp: string
  type: "text" | "system"
}

interface ChatPanelProps {
  onClose: () => void
  onSendMessage: (message: string) => void
  messages: ChatMessage[]
  localParticipantId: string | null
  signalingRef: React.MutableRefObject<Socket | null> // Add this prop
}

export default function ChatPanel({
  onClose,
  onSendMessage,
  messages,
  localParticipantId,
  signalingRef,
}: ChatPanelProps) {
  const [message, setMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // REMOVE: const { signalingRef } = useWebRTC() // Access the signaling socket

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Listen for incoming chat messages from the signaling server
  useEffect(() => {
    const socket = signalingRef.current
    if (socket) {
      const handleIncomingChatMessage = (msg: {
        message: string
        senderId: string
        userName: string
        timestamp: string
      }) => {
        // This is where you would update the `messages` state in the parent component
        // For now, we'll just log it, as `messages` is passed as a prop.
        // The parent `WebRTCVideoCall` component should be responsible for updating `chatMessages` state.
        console.log("Received chat message in ChatPanel:", msg)
      }

      socket.on("chat-message", handleIncomingChatMessage)

      return () => {
        socket.off("chat-message", handleIncomingChatMessage)
      }
    }
  }, [signalingRef])

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-50 text-lg">Chat</h3>
            <p className="text-xs text-gray-400">{messages.filter((m) => m.type === "text").length} messages</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Enhanced Messages Area */}
      <ScrollArea className="flex-1 p-4 sm:p-6">
        <div className="space-y-4">
          {messages.length === 1 && messages[0].type === "system" ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-gray-500" />
              </div>
              <h4 className="text-gray-300 font-medium mb-2">Start the conversation</h4>
              <p className="text-gray-500 text-sm">Send a message to get the chat going!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`${msg.type === "system" ? "text-center" : ""}`}>
                {msg.type === "system" ? (
                  <div className="text-xs text-gray-400 bg-gray-800/30 rounded-full px-4 py-2 inline-block backdrop-blur-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`flex ${msg.senderId === localParticipantId ? "justify-end" : "justify-start"} group`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] ${msg.senderId === localParticipantId ? "order-2" : "order-1"}`}
                    >
                      {msg.senderId !== localParticipantId && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Avatar className="w-7 h-7 border border-gray-600">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                              {msg.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-gray-300">{msg.userName}</span>
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3 sm:p-4 shadow-lg transition-all duration-200 group-hover:shadow-xl ${
                          msg.senderId === localParticipantId
                            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto"
                            : "bg-gray-800/80 backdrop-blur-sm text-gray-100 border border-gray-700/50"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        {msg.senderId === localParticipantId && (
                          <div className="text-xs text-blue-100/70 mt-1 text-right">{msg.timestamp}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Modern Input Area */}
      <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="bg-gray-800/50 border-gray-600/50 text-gray-50 placeholder:text-gray-400 pr-16 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-200"
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-700/50 rounded-lg"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-700/50 rounded-lg"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="h-12 w-12 p-0 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>Press Enter to send</span>
          <span>{message.length}/500</span>
        </div>
      </div>
    </div>
  )
}
