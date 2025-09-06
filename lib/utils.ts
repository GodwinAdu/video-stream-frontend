import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chat utility functions for WebRTC video calling

export interface ChatMessage {
  id: string
  senderId: string
  userName: string
  content: string
  timestamp: string
  type: "text" | "system"
}

// Send message function for chat functionality
export const sendMessage = (message: string, senderId: string, userName: string): ChatMessage => {
  return {
    id: `${senderId}-${Date.now()}`,
    senderId,
    userName,
    content: message,
    timestamp: new Date().toISOString(),
    type: "text",
  }
}

// Format timestamp for display
export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Validate message content
export const validateMessage = (message: string): boolean => {
  return message.trim().length > 0 && message.length <= 1000
}
