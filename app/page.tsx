"use client"

import WebRTCVideoCall from "@/components/video-call/webrtc-video-call"
import ErrorBoundary from "@/components/error-boundary"

export default function Home() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900">
        <WebRTCVideoCall />
      </div>
    </ErrorBoundary>
  )
}
