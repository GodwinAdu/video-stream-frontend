"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { io, type Socket } from "socket.io-client"
import { sendMessage } from "@/lib/utils" // Declare or import sendMessage

// Define ConnectionHealth interface to match server
export interface ConnectionHealth {
  connectedAt: number
  lastPing: number
  pingCount: number
  reconnectCount: number
  isHealthy: boolean
  latency?: number
}

export interface Participant {
  id: string // Socket ID
  name: string
  avatar?: string
  isMuted: boolean
  isVideoOff: boolean
  isHost: boolean
  isRaiseHand: boolean
  stream?: MediaStream // Remote stream for this participant
  activeReaction?: { emoji: string; timestamp: number } // New: for transient reactions
  reactionTimeoutId?: NodeJS.Timeout // New: to manage clearing reactions
  // Added for client-side representation of server's User status
  status: "online" | "offline"
  joinedAt: string
  lastSeen: string
}

export interface WebRTCState {
  localStream: MediaStream | null
  participants: Participant[]
  isConnected: boolean
  connectionState: RTCPeerConnectionState
  socketConnectionHealth: ConnectionHealth | null
  isScreenSharing: boolean
  error: string | null
  localParticipantId: string | null
  isVirtualBackgroundEnabled: boolean
  isReconnecting: boolean
  bufferedChatMessages: any[]
  networkQuality: "excellent" | "good" | "poor" | "disconnected"
  bandwidth: { upload: number; download: number }
  speakingParticipants: Set<string>
}

export interface WebRTCActions {
  joinRoom: (roomId: string, userName: string) => Promise<void>
  leaveRoom: () => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleRaiseHand: () => void
  sendReaction: (emoji: string) => void
  toggleVirtualBackground: (enable: boolean) => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  sendMessage: (message: string) => void
  getParticipantById: (id: string) => Participant | undefined
  setBufferedChatMessages: React.Dispatch<React.SetStateAction<any[]>> // Expose setter for buffered messages
}

export function useWebRTC(): WebRTCState & WebRTCActions & { signalingRef: React.MutableRefObject<Socket | null> } {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([]) // Stores remote participants
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new") // WebRTC PeerConnection state
  const [socketConnectionHealth, setSocketConnectionHealth] = useState<ConnectionHealth | null>(null) // Socket.IO connection health
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(null)
  const [isVirtualBackgroundEnabled, setIsVirtualBackgroundEnabled] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [bufferedChatMessages, setBufferedChatMessages] = useState<any[]>([])
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor" | "disconnected">("excellent")
  const [bandwidth, setBandwidth] = useState({ upload: 0, download: 0 })
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set())

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map()) // participantId -> RTCPeerConnection
  const signalingRef = useRef<Socket | null>(null)
  const roomIdRef = useRef<string>("")
  const userNameRef = useRef<string>("")
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null) // Ref for ping interval
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // NEW: Ref to hold the latest localStream to make leaveRoom stable
  const localStreamRef = useRef<MediaStream | null>(null)
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // Helper to get a participant by ID
  const getParticipantById = useCallback(
    (id: string) => {
      return participants.find((p) => p.id === id)
    },
    [participants],
  )

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    console.log("Attempting to initialize local media stream...")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      console.log("Local media stream acquired successfully:", stream)
      console.log("Stream ID:", stream.id, "Active:", stream.active)

      // Add track ended listeners to handle device disconnection
      stream.getTracks().forEach((track) => {
        console.log(
          `Track acquired: ${track.kind}, ID: ${track.id}, Enabled: ${track.enabled}, ReadyState: ${track.readyState}`,
        )
        if (!track.enabled) {
          console.warn(`[WARN] Track ${track.kind} is not enabled by default. Enabling it.`)
          track.enabled = true
        }
        if (track.readyState !== "live") {
          console.warn(`[WARN] Track ${track.kind} readyState is not 'live': ${track.readyState}`)
        }

        // Handle track ending (device disconnected/disabled)
        track.onended = () => {
          console.warn(`${track.kind} track ended - device may have been disconnected`)
          setError(`${track.kind === "video" ? "Camera" : "Microphone"} was disconnected or disabled`)

          // Try to get a new stream
          setTimeout(async () => {
            try {
              const newStream = await navigator.mediaDevices.getUserMedia({
                video: track.kind === "video",
                audio: track.kind === "audio",
              })

              // Replace the ended track
              if (track.kind === "video") {
                const newVideoTrack = newStream.getVideoTracks()[0]
                if (newVideoTrack) {
                  stream.removeTrack(track)
                  stream.addTrack(newVideoTrack)
                  setLocalStream(new MediaStream(stream.getTracks()))
                  setError(null)
                }
              } else {
                const newAudioTrack = newStream.getAudioTracks()[0]
                if (newAudioTrack) {
                  stream.removeTrack(track)
                  stream.addTrack(newAudioTrack)
                  setLocalStream(new MediaStream(stream.getTracks()))
                  setError(null)
                }
              }
            } catch (err) {
              console.error("Failed to recover from track ending:", err)
            }
          }, 1000)
        }
      })

      console.log("Setting local stream state...")
      setLocalStream(stream)

      // Set up audio level detection for local stream
      setupAudioLevelDetection(stream)

      console.log("Local stream state set")
      return stream
    } catch (err) {
      console.error("Error accessing media devices:", err)
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Permission denied: Please allow camera and microphone access.")
          localStorage.removeItem("media-permissions-granted")
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found.")
        } else if (err.name === "NotReadableError") {
          setError("Camera/microphone is in use by another application.")
        } else {
          setError(`Media device error: ${err.message}`)
        }
      } else {
        setError("Failed to access camera/microphone. Please check permissions.")
      }
      throw err
    }
  }, [])

  // Enhanced ICE Servers for mobile compatibility
  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free TURN servers for testing (replace with your own for production)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ]
  const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  // Create and configure a new RTCPeerConnection for a given remote participant
  const createPeerConnection = useCallback(
    (participantId: string, streamToAdd: MediaStream | null): RTCPeerConnection => {
      let peerConnection = peerConnections.current.get(participantId)
      if (peerConnection) {
        console.log(`[PC ${participantId}] Returning existing peer connection.`)
        return peerConnection
      }

      console.log(`[PC ${participantId}] Creating new peer connection.`)
      peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      })

      // Add local tracks
      if (streamToAdd?.getTracks().length) {
        streamToAdd.getTracks().forEach(track => {
          console.log(`[PC ${participantId}] Adding ${track.kind} track`)
          peerConnection!.addTrack(track, streamToAdd)
        })
        console.log(`[PC ${participantId}] Added ${streamToAdd.getTracks().length} tracks`)
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && signalingRef.current && signalingRef.current.connected) {
          signalingRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            targetId: participantId,
            senderId: signalingRef.current.id,
          })
        }
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log(`[PC ${participantId}] ✅ TRACK RECEIVED:`, event.track.kind)
        
        const stream = event.streams[0]
        if (stream) {
          console.log(`[PC ${participantId}] Using event stream:`, stream.id)
          setParticipants(prev => 
            prev.map(p => p.id === participantId ? { ...p, stream } : p)
          )
        } else {
          console.log(`[PC ${participantId}] Creating new stream`)
          const newStream = new MediaStream([event.track])
          setParticipants(prev => 
            prev.map(p => p.id === participantId ? { ...p, stream: newStream } : p)
          )
        }
      }

      // Handle connection state changes for this specific peer
      peerConnection.onconnectionstatechange = () => {
        console.log(`[PC ${participantId}] Peer connection state changed to:`, peerConnection?.connectionState)
        setConnectionState(peerConnection?.connectionState || "new")

        // Handle failed connections
        if (peerConnection?.connectionState === "failed") {
          console.warn(`[PC ${participantId}] Connection failed, attempting to restart ICE`)
          peerConnection.restartIce()
        }
      }

      // Handle signaling state changes
      peerConnection.onsignalingstatechange = () => {
        console.log(`[PC ${participantId}] Signaling state changed to:`, peerConnection?.signalingState)
      }

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`[PC ${participantId}] ICE connection state changed to:`, peerConnection?.iceConnectionState)

        if (peerConnection?.iceConnectionState === "failed") {
          console.warn(`[PC ${participantId}] ICE connection failed, restarting ICE`)
          peerConnection.restartIce()
        }
      }

      peerConnections.current.set(participantId, peerConnection)
      return peerConnection
    },
    [], // Dependencies are handled by passing streamToAdd
  )

  // Function to start sending pings to the server
  const startPinging = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    pingIntervalRef.current = setInterval(() => {
      if (signalingRef.current && signalingRef.current.connected) {
        signalingRef.current.emit("ping", { timestamp: Date.now() })
      }
    }, 25000) // Match server's pingInterval
  }, [])

  // Signaling setup
  const setupSignaling = useCallback(
    (roomId: string, userName: string, stream: MediaStream) => {
      const socket = io(SIGNALING_SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        timeout: 20000,
        path: "/socket.io/",
        transports: ["polling", "websocket"], // Start with polling for mobile
        upgrade: true,
        rememberUpgrade: false, // Don't remember upgrade for mobile
        forceNew: false,
        autoConnect: true,
        // Mobile-specific settings
        closeOnBeforeunload: false,
      })

      socket.on("connect", () => {
        console.log("[Socket] Connected to signaling server:", socket.id)
        console.log("[Socket] Transport:", socket.io.engine.transport.name)
        setLocalParticipantId(socket.id)
        setIsConnected(true)
        setIsReconnecting(false)
        setError(null) // Clear any previous errors
        socket.emit("join-room", { roomId, userName })
        startPinging()
      })

      socket.on("connection-confirmed", (data) => {
        console.log("[Socket] Server confirmed connection:", data)
        // You can use data.connectionHealth here if needed for initial health status
      })

      socket.on("server-shutdown", (data) => {
        console.warn("[Socket] Server is shutting down:", data.message)
        setError(`Server restarting: ${data.message}. Please wait and try rejoining.`)
        // Do not call leaveRoom here, let the disconnect event handle cleanup
        // The client will attempt to reconnect automatically
      })

      socket.on("reconnect_attempt", (attemptNumber) => {
        console.log(`[Socket] Attempting to reconnect... (Attempt ${attemptNumber})`)
        setIsReconnecting(true)
        setError("Reconnecting to meeting...")
      })

      socket.on("reconnect", (attemptNumber) => {
        console.log(`[Socket] Reconnected successfully after ${attemptNumber} attempts.`)
        setIsReconnecting(false)
        setError(null)
        // Re-emit join-room to ensure server state is consistent after reconnection
        socket.emit("join-room", { roomId: roomIdRef.current, userName: userNameRef.current })
        startPinging() // Restart pings after reconnection
      })

      socket.on("reconnect_error", (err) => {
        console.error("[Socket] Reconnection error:", err)
        setError("Reconnection failed. Please check your network.")
      })

      socket.on("reconnect_failed", () => {
        console.error("[Socket] Reconnection failed permanently.")
        setIsReconnecting(false)
        setError("Failed to reconnect to meeting. Please refresh or try again later.")
        leaveRoom() // Force leave if reconnection fails completely
      })

      socket.on("pong", (data) => {
        setSocketConnectionHealth(data.connectionHealth)
        // Update network quality based on latency
        const latency = data.connectionHealth?.latency || 0
        if (latency < 150) setNetworkQuality("excellent")
        else if (latency < 300) setNetworkQuality("good")
        else setNetworkQuality("poor")
      })

      socket.on("user-joined", async (participant) => {
        console.log(`[Socket] User joined: ${participant.name} (${participant.id})`)
        setParticipants((prev) => [...prev, { ...participant, stream: undefined, status: "online" }])

        // Create peer connection and offer
        const peerConnection = createPeerConnection(participant.id, stream)
        try {
          console.log(`[Socket] Creating offer for ${participant.id}`)
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await peerConnection.setLocalDescription(offer)
          console.log(`[Socket] ✅ Offer created and sent to ${participant.id}`)
          socket.emit("offer", { offer, targetId: participant.id, senderId: socket.id })
        } catch (e) {
          console.error(`[Socket] ❌ Offer error:`, e)
        }
      })

      socket.on("current-participants", async (currentParticipants) => {
        console.log("[Socket] Setting up connections with existing participants")
        setParticipants(currentParticipants.map((p: any) => ({ ...p, stream: undefined, status: "online" })))

        for (const participant of currentParticipants) {
          const peerConnection = createPeerConnection(participant.id, stream)
          try {
            const offer = await peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await peerConnection.setLocalDescription(offer)
            socket.emit("offer", { offer, targetId: participant.id, senderId: socket.id })
          } catch (e) {
            console.error(`[Socket] Offer error:`, e)
          }
        }
      })

      socket.on("user-left", ({ participantId, userName: leftUserName }) => {
        console.log(`[Socket] User ${leftUserName} (${participantId}) left.`)
        setParticipants((prev) => prev.filter((p) => p.id !== participantId))
        const pc = peerConnections.current.get(participantId)
        if (pc) {
          pc.close()
          peerConnections.current.delete(participantId)
          console.log(`[Socket] Closed peer connection for ${participantId}.`)
        }
      })

      socket.on("offer", async ({ offer, senderId }) => {
        console.log(`[Socket] Received offer from ${senderId}`)
        const peerConnection = createPeerConnection(senderId, stream)
        try {
          console.log(`[Socket] Processing offer from ${senderId}`)
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          console.log(`[Socket] ✅ Answer created and sent to ${senderId}`)
          socket.emit("answer", { answer, targetId: senderId, senderId: socket.id })
        } catch (e) {
          console.error(`[Socket] ❌ Answer error:`, e)
        }
      })

      socket.on("answer", async ({ answer, senderId }) => {
        console.log(`[Socket] Received answer from ${senderId}. Setting remote description.`)
        const peerConnection = peerConnections.current.get(senderId)
        if (peerConnection) {
          try {
            // Check if we're in the right state to set remote description
            if (peerConnection.signalingState === "have-local-offer") {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
              console.log(`[Socket] Set remote answer for ${senderId}.`)
            } else {
              console.warn(`[Socket] Invalid signaling state for answer: ${peerConnection.signalingState}`)
            }
          } catch (e) {
            console.error(`[Socket] Error setting remote answer for ${senderId}:`, e)
            setError(`WebRTC error with ${senderId}: Failed to process answer.`)
          }
        } else {
          console.warn(`[Socket] Peer connection for ${senderId} not found when receiving answer.`)
        }
      })

      socket.on("ice-candidate", async ({ candidate, senderId }) => {
        // console.log(`[Socket] Received ICE candidate from ${senderId}.`) // Too verbose
        const peerConnection = peerConnections.current.get(senderId)
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            // console.log(`[Socket] Added ICE candidate for ${senderId}.`) // Too verbose
          } catch (e) {
            console.error(`[Socket] Error adding received ICE candidate for ${senderId}:`, e)
            // This error can sometimes happen if candidate is already added or session description is not set yet.
            // It's often benign, but worth logging.
          }
        } else {
          console.warn(`[Socket] Peer connection for ${senderId} not found when receiving ICE candidate.`)
        }
      })

      socket.on("user-muted", ({ participantId, isMuted }) => {
        console.log(`[Socket] User ${participantId} muted: ${isMuted}`)
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === participantId) {
              if (p.stream) {
                const audioTrack = p.stream.getAudioTracks()[0]
                if (audioTrack) {
                  audioTrack.enabled = !isMuted
                  console.log(`[Socket] Updated audio track enabled: ${audioTrack.enabled}`)
                }
              }
              return { ...p, isMuted: isMuted }
            }
            return p
          }),
        )
      })

      socket.on("user-video-toggled", ({ participantId, isVideoOff }) => {
        console.log(`[Socket] User ${participantId} video off: ${isVideoOff}`)
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === participantId) {
              if (p.stream) {
                const videoTrack = p.stream.getVideoTracks()[0]
                if (videoTrack) {
                  videoTrack.enabled = !isVideoOff
                  console.log(`[Socket] Updated video track enabled: ${videoTrack.enabled}`)
                }
              }
              return { ...p, isVideoOff: isVideoOff }
            }
            return p
          }),
        )
      })

      socket.on("raise-hand-toggled", ({ participantId, isRaiseHand }) => {
        setParticipants((prev) => prev.map((p) => (p.id === participantId ? { ...p, isRaiseHand: isRaiseHand } : p)))
      })

      socket.on("reaction-received", ({ emoji, senderId, userName }) => {
        console.log(`[Reaction] ${userName} (${senderId}): ${emoji}`)
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === senderId) {
              if (p.reactionTimeoutId) {
                clearTimeout(p.reactionTimeoutId)
              }
              const newReaction = { emoji, timestamp: Date.now() }
              const timeoutId = setTimeout(() => {
                setParticipants((current) =>
                  current.map((cp) =>
                    cp.id === senderId ? { ...cp, activeReaction: undefined, reactionTimeoutId: undefined } : cp,
                  ),
                )
              }, 3000)
              return { ...p, activeReaction: newReaction, reactionTimeoutId: timeoutId }
            }
            return p
          }),
        )
      })

      socket.on("participant-count", (count) => {
        console.log(`[Socket] Participant count updated: ${count}`)
        // Update UI participant count display
      })

      socket.on("chat-message", ({ message, senderId, userName, timestamp }) => {
        console.log(`[Chat] ${userName} (${senderId}): ${message} at ${timestamp}`)
        // This event is handled by WebRTCVideoCall component directly via signalingRef
      })

      socket.on("buffered-messages", (messages) => {
        console.log("[Socket] Received buffered messages:", messages)
        setBufferedChatMessages(messages)
      })

      socket.on("force-disconnect", (data) => {
        console.log("[Socket] Force disconnect:", data.message)
        setError(`Connection closed: ${data.message}`)
        // Don't auto-reconnect on force disconnect
        socket.disconnect()
        leaveRoom()
      })

      socket.on("host-changed", ({ newHostId, newHostName }) => {
        console.log(`[Socket] Host changed to ${newHostName} (${newHostId})`)
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isHost: p.id === newHostId,
          })),
        )
      })

      socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected from signaling server, reason:", reason)
        setIsConnected(false)
        if (reason === "io server disconnect") {
          // Server initiated disconnect, likely due to graceful shutdown
          setError("Disconnected by server. Attempting to reconnect...")
        } else if (reason === "transport close" || reason === "ping timeout") {
          // Network issues, reconnection attempts will follow
          setError("Network unstable. Attempting to reconnect...")
        } else {
          setError(`Disconnected: ${reason}. Attempting to reconnect...`)
        }
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
      })

      socket.on("connect_error", (err) => {
        console.error("[Socket] Socket.io connection error:", err)
        console.error("Error message:", err.message)
        console.error("Error description:", err.description)
        console.error("Error context:", err.context)
        console.error("Error type:", err.type)

        let errorMessage = "Failed to connect to meeting server."
        if (err.message === "xhr poll error") {
          errorMessage = "Network connection failed. Trying different connection method..."
          // Try to reconnect with different transport
          setTimeout(() => {
            if (!socket.connected) {
              socket.io.opts.transports = ["websocket", "polling"]
              socket.connect()
            }
          }, 2000)
        } else if (err.type === "TransportError") {
          errorMessage = "Connection transport error. Retrying with different method..."
          // Try reconnecting without changing transports first
          setTimeout(() => {
            if (!socket.connected) {
              socket.disconnect()
              socket.connect()
            }
          }, 2000)
        } else if (err.description === 0) {
          errorMessage = "Server connection refused. Please check your network and try again."
        } else {
          errorMessage = "Connection failed. Please check your internet connection."
        }

        setError(errorMessage)
        setIsConnected(false)
        setIsReconnecting(true) // Keep trying to reconnect
      })

      socket.on("participant-muted", ({ participantId, isMuted }) => {
        console.log(`[Socket] Participant ${participantId} ${isMuted ? "muted" : "unmuted"}`)
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === participantId) {
              if (p.stream) {
                const audioTrack = p.stream.getAudioTracks()[0]
                if (audioTrack) {
                  audioTrack.enabled = !isMuted
                }
              }
              return { ...p, isMuted }
            }
            return p
          }),
        )
      })

      socket.on("participant-video-toggled", ({ participantId, isVideoOff }) => {
        console.log(`[Socket] Participant ${participantId} video ${isVideoOff ? "off" : "on"}`)
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === participantId) {
              if (p.stream) {
                const videoTrack = p.stream.getVideoTracks()[0]
                if (videoTrack) {
                  videoTrack.enabled = !isVideoOff
                }
              }
              return { ...p, isVideoOff }
            }
            return p
          }),
        )
      })

      signalingRef.current = socket
      return socket
    },
    [createPeerConnection, startPinging, setBufferedChatMessages], // Removed leaveRoom from dependencies
  )

  // Leave room - MODIFIED to use localStreamRef.current and be stable
  const leaveRoom = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()

    if (localStreamRef.current) {
      // Use the ref here
      console.log("Stopping local media tracks...")
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      setLocalStream(null) // Still update state to null
    }

    if (signalingRef.current) {
      console.log("Disconnecting from signaling server...")
      signalingRef.current.disconnect()
      signalingRef.current = null
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    setParticipants([])
    setIsConnected(false)
    setConnectionState("closed")
    setSocketConnectionHealth(null)
    setIsScreenSharing(false)
    setError(null)
    setLocalParticipantId(null)
    setIsVirtualBackgroundEnabled(false)
    setIsReconnecting(false)
    setBufferedChatMessages([])

    console.log("Left room")
  }, []) // IMPORTANT: Empty dependency array makes this callback stable

  // Join room
  const joinRoom = useCallback(
    async (roomId: string, userName: string) => {
      try {
        setError(null)
        roomIdRef.current = roomId
        userNameRef.current = userName

        const stream = await initializeLocalStream()
        setupSignaling(roomId, userName, stream)

        console.log(`Attempting to join room ${roomId} as ${userName}`)
      } catch (err) {
        console.error("Failed to join room:", err)
        setError("Failed to join room. Check camera/mic permissions or server connection.")
      }
    },
    [initializeLocalStream, setupSignaling],
  )

  // Audio level detection for speaking indicators
  const setupAudioLevelDetection = useCallback(
    (stream: MediaStream) => {
      try {
        const audioTrack = stream.getAudioTracks()[0]
        if (!audioTrack) {
          console.warn("No audio track available for level detection")
          return
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) {
          console.warn("AudioContext not supported in this browser")
          return
        }

        audioContextRef.current = new AudioContextClass()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        source.connect(analyserRef.current)

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

        const checkAudioLevel = () => {
          if (!analyserRef.current || !localParticipantId) return

          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length

          const isAudioEnabled = audioTrack?.enabled || false
          const isSpeaking = average > 30 && isAudioEnabled

          setSpeakingParticipants((prev) => {
            const newSet = new Set(prev)
            if (isSpeaking) {
              newSet.add(localParticipantId)
            } else {
              newSet.delete(localParticipantId)
            }
            return newSet
          })

          requestAnimationFrame(checkAudioLevel)
        }

        checkAudioLevel()
      } catch (error) {
        console.error("Failed to setup audio level detection:", error)
      }
    },
    [localParticipantId],
  )

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        const isMuted = !audioTrack.enabled

        console.log(`Local audio toggled: ${audioTrack.enabled ? "on" : "off"}`)

        setParticipants((prev) => prev.map((p) => (p.id === localParticipantId ? { ...p, isMuted } : p)))

        // Emit to other participants
        if (signalingRef.current && signalingRef.current.connected) {
          signalingRef.current.emit("user-muted", {
            participantId: signalingRef.current.id,
            isMuted,
          })
        }
      } else {
        console.warn("No audio track found in local stream to toggle mute.")
        setError("No microphone available to mute/unmute")
      }
    } else {
      console.warn("No local stream available to toggle mute.")
      setError("No audio stream available. Please check your microphone permissions.")
    }
  }, [localStream, localParticipantId])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        const newVideoOffState = !videoTrack.enabled
        videoTrack.enabled = !newVideoOffState

        console.log(`Local video toggled: ${videoTrack.enabled ? "on" : "off"}`)

        // Update local participant state immediately
        setParticipants((prev) =>
          prev.map((p) => (p.id === signalingRef.current?.id ? { ...p, isVideoOff: newVideoOffState } : p)),
        )

        // Emit to other participants
        if (signalingRef.current && signalingRef.current.connected) {
          signalingRef.current.emit("user-video-toggled", {
            participantId: signalingRef.current.id,
            isVideoOff: newVideoOffState,
          })
        }
      } else {
        console.warn("No video track found in local stream to toggle video.")
        setError("No camera available to enable/disable")
      }
    } else {
      console.warn("No local stream available to toggle video.")
      setError("No video stream available")
    }
  }, [localStream])

  // Toggle raise hand
  const toggleRaiseHand = useCallback(() => {
    if (signalingRef.current && signalingRef.current.connected && localParticipantId) {
      const currentLocalParticipant = participants.find((p) => p.id === localParticipantId)
      const newRaiseHandState = !currentLocalParticipant?.isRaiseHand

      setParticipants((prev) =>
        prev.map((p) => (p.id === localParticipantId ? { ...p, isRaiseHand: newRaiseHandState } : p)),
      )

      signalingRef.current.emit("raise-hand-toggled", {
        participantId: localParticipantId,
        isRaiseHand: newRaiseHandState,
      })
    }
  }, [localParticipantId, participants])

  // Send reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      if (signalingRef.current && signalingRef.current.connected && localParticipantId) {
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === localParticipantId) {
              if (p.reactionTimeoutId) {
                clearTimeout(p.reactionTimeoutId)
              }
              const newReaction = { emoji, timestamp: Date.now() }
              const timeoutId = setTimeout(() => {
                setParticipants((current) =>
                  current.map((cp) =>
                    cp.id === localParticipantId
                      ? { ...cp, activeReaction: undefined, reactionTimeoutId: undefined }
                      : cp,
                  ),
                )
              }, 3000)
              return { ...p, activeReaction: newReaction, reactionTimeoutId: timeoutId }
            }
            return p
          }),
        )

        signalingRef.current.emit("reaction", {
          emoji,
          senderId: localParticipantId,
          timestamp: new Date().toISOString(),
        })
      }
    },
    [localParticipantId, setParticipants],
  )

  // Toggle virtual background (conceptual implementation)
  const toggleVirtualBackground = useCallback(
    async (enable: boolean) => {
      if (!localStream) {
        setError("No local stream available to apply virtual background.")
        return
      }

      setIsVirtualBackgroundEnabled(enable)

      if (enable) {
        console.log("Virtual Backgrounds: Attempting to enable.")
        setError("Virtual Backgrounds feature is conceptual. Actual AI processing is not implemented in this demo.")
      } else {
        console.log("Virtual Backgrounds: Attempting to disable.")
        setError(null)
      }
    },
    [localStream],
  )

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!localStream) return

    try {
      const currentAudioTrack = localStream.getAudioTracks()[0]
      const currentAudioEnabled = currentAudioTrack?.enabled || false

      const cameraAndMicStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      console.log("Restored camera and mic stream:", cameraAndMicStream)

      const newVideoTrack = cameraAndMicStream.getVideoTracks()[0]
      const newAudioTrack = cameraAndMicStream.getAudioTracks()[0]

      if (newAudioTrack) {
        newAudioTrack.enabled = currentAudioEnabled
      }

      peerConnections.current.forEach((pc) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === "video")
        if (videoSender) {
          console.log("Replacing video track with camera on peer connection.")
          videoSender.replaceTrack(newVideoTrack)
        }
        const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio")
        if (audioSender && newAudioTrack) {
          console.log("Replacing audio track with mic on peer connection.")
          audioSender.replaceTrack(newAudioTrack)
        }
      })

      const oldTracks = localStream.getTracks()
      oldTracks.forEach((track) => {
        localStream.removeTrack(track)
        track.stop()
      })

      localStream.addTrack(newVideoTrack)
      if (newAudioTrack) {
        localStream.addTrack(newAudioTrack)
      }

      setLocalStream(localStream)
      setIsScreenSharing(false)
      console.log("Screen sharing stopped, camera restored.")
    } catch (err) {
      console.error("Failed to stop screen sharing or get camera back:", err)
      setError("Failed to stop screen sharing or restore camera. Please refresh.")
    }
  }, [localStream])

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!localStream) {
      setError("No local stream available for screen sharing")
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      const screenVideoTrack = screenStream.getVideoTracks()[0]
      const screenAudioTrack = screenStream.getAudioTracks()[0]

      const originalAudioTrack = localStream.getAudioTracks()[0]
      const wasAudioEnabled = originalAudioTrack?.enabled || false

      peerConnections.current.forEach((pc) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === "video")
        if (videoSender) {
          console.log("Replacing video track for screen share on peer connection.")
          videoSender.replaceTrack(screenVideoTrack)
        }
        const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio")
        if (audioSender && screenAudioTrack) {
          console.log("Replacing audio track for screen share on peer connection.")
          audioSender.replaceTrack(screenAudioTrack)
        }
      })

      const oldVideoTrack = localStream.getVideoTracks()[0]
      if (oldVideoTrack) {
        console.log("Stopping old local video track and removing from stream.")
        localStream.removeTrack(oldVideoTrack)
        oldVideoTrack.stop()
      }
      localStream.addTrack(screenVideoTrack)
      if (screenAudioTrack) {
        const oldAudioTrack = localStream.getAudioTracks()[0]
        if (oldAudioTrack) {
          console.log("Stopping old local audio track and removing from stream.")
          localStream.removeTrack(oldAudioTrack)
          oldAudioTrack.stop()
        }
        localStream.addTrack(screenAudioTrack)
        screenAudioTrack.enabled = wasAudioEnabled
      }

      setLocalStream(localStream)
      setIsScreenSharing(true)
      console.log("Screen sharing started.")

      screenVideoTrack.onended = () => {
        console.log("Screen share ended by user.")
        stopScreenShare()
      }
    } catch (err) {
      console.error("Failed to start screen sharing:", err)
      setError("Failed to start screen sharing. Please check permissions.")
    }
  }, [localStream, stopScreenShare])

  // Cleanup on unmount - now leaveRoom is stable, so this only runs on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom]) // leaveRoom is now a stable dependency

  return {
    localStream,
    participants,
    isConnected,
    connectionState,
    socketConnectionHealth,
    isScreenSharing,
    error,
    localParticipantId,
    isVirtualBackgroundEnabled,
    isReconnecting,
    bufferedChatMessages,
    networkQuality,
    bandwidth,
    speakingParticipants,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleRaiseHand,
    sendReaction,
    toggleVirtualBackground,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    getParticipantById,
    signalingRef,
    setBufferedChatMessages,
  }
}
