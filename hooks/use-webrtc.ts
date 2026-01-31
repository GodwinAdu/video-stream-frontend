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
  isLocalHost: boolean
  isVirtualBackgroundEnabled: boolean
  isReconnecting: boolean
  bufferedChatMessages: any[]
  networkQuality: "excellent" | "good" | "poor" | "disconnected"
  bandwidth: { upload: number; download: number }
  speakingParticipants: Set<string>
  screenSharingParticipantId: string | null
}

export interface WebRTCActions {
  joinRoom: (roomId: string, userName: string, userId?: string) => Promise<void>
  leaveRoom: () => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleRaiseHand: () => void
  sendReaction: (emoji: string) => void
  toggleVirtualBackground: (enable: boolean) => void
  applyVirtualBackground: (stream: MediaStream | null) => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  sendMessage: (message: string, senderId: string, userName: string) => void
  getParticipantById: (id: string) => Participant | undefined
  setBufferedChatMessages: React.Dispatch<React.SetStateAction<any[]>> // Expose setter for buffered messages
}

export function useWebRTC(): WebRTCState & WebRTCActions & { signalingRef: React.RefObject<Socket | null> } {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([]) // Stores remote participants
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new") // WebRTC PeerConnection state
  const [socketConnectionHealth, setSocketConnectionHealth] = useState<ConnectionHealth | null>(null) // Socket.IO connection health
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(null)
  const [isLocalHost, setIsLocalHost] = useState(false) // Track local host status from server
  const [isVirtualBackgroundEnabled, setIsVirtualBackgroundEnabled] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [bufferedChatMessages, setBufferedChatMessages] = useState<any[]>([])
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor" | "disconnected">("excellent")
  const [bandwidth, setBandwidth] = useState({ upload: 0, download: 0 })
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set())
  const [virtualBackgroundStream, setVirtualBackgroundStream] = useState<MediaStream | null>(null)
  const [screenSharingParticipantId, setScreenSharingParticipantId] = useState<string | null>(null)

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
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = "Your browser doesn't support camera/microphone access. Please use a modern browser."
      console.error(error)
      setError(error)
      throw new Error(error)
    }
    
    // Check if we're on HTTPS (required for mobile Safari)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!isSecure) {
      console.warn("⚠️ Not on HTTPS - mobile devices may block camera/microphone access")
    }
    
    try {
      // Mobile-friendly constraints with fallback
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      const constraints = {
        video: isMobile ? {
          facingMode: "user",
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
        } : {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }
      
      console.log(`Device type: ${isMobile ? 'Mobile' : 'Desktop'}, using constraints:`, constraints)
      
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (firstError) {
        console.warn("First attempt failed, trying with basic constraints:", firstError)
        // Fallback to most basic constraints for problematic devices
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
      }
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
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
          
          let errorMsg = "Permission denied: Please allow camera and microphone access."
          if (isMobile && !isSecure) {
            errorMsg += " Note: Mobile browsers require HTTPS for camera/microphone access."
          }
          setError(errorMsg)
          localStorage.removeItem("media-permissions-granted")
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please check your device.")
        } else if (err.name === "NotReadableError") {
          setError("Camera/microphone is in use by another application. Please close other apps and try again.")
        } else if (err.name === "OverconstrainedError") {
          setError("Your device doesn't support the required video quality. Please try a different device.")
        } else {
          setError(`Media device error: ${err.message}`)
        }
      } else {
        setError("Failed to access camera/microphone. Please check permissions and try again.")
      }
      throw err
    }
  }, [])

  // Production-ready ICE Servers with multiple STUN/TURN options
  const ICE_SERVERS = [
    // Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Cloudflare STUN
    { urls: "stun:stun.cloudflare.com:3478" },
    // Free TURN servers (use your own in production)
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
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
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
        iceTransportPolicy: "all", // Try all connection types
      })

      // Add local tracks with better error handling
      if (streamToAdd?.getTracks().length) {
        streamToAdd.getTracks().forEach(track => {
          try {
            console.log(`[PC ${participantId}] Adding ${track.kind} track (enabled: ${track.enabled}, readyState: ${track.readyState})`)
            const sender = peerConnection!.addTrack(track, streamToAdd)
            console.log(`[PC ${participantId}] Track added successfully, sender:`, sender.track?.kind)
          } catch (error) {
            console.error(`[PC ${participantId}] Failed to add ${track.kind} track:`, error)
          }
        })
        console.log(`[PC ${participantId}] Added ${streamToAdd.getTracks().length} tracks`)
      } else {
        console.warn(`[PC ${participantId}] No tracks to add to peer connection`)
      }

      // Handle ICE candidates with better logging
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[PC ${participantId}] ICE candidate:`, event.candidate.type, event.candidate.protocol)
          if (signalingRef.current && signalingRef.current.connected) {
            signalingRef.current.emit("ice-candidate", {
              candidate: event.candidate,
              targetId: participantId,
              senderId: signalingRef.current.id,
            })
          }
        } else {
          console.log(`[PC ${participantId}] ICE gathering complete`)
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
          
          // Set up audio level detection for remote participant
          if (event.track.kind === 'audio') {
            setupRemoteAudioLevelDetection(stream, participantId)
          }
        } else {
          console.log(`[PC ${participantId}] Creating new stream`)
          const newStream = new MediaStream([event.track])
          setParticipants(prev => 
            prev.map(p => p.id === participantId ? { ...p, stream: newStream } : p)
          )
          
          // Set up audio level detection for remote participant
          if (event.track.kind === 'audio') {
            setupRemoteAudioLevelDetection(newStream, participantId)
          }
        }
      }

      // Handle connection state changes for this specific peer
      peerConnection.onconnectionstatechange = () => {
        console.log(`[PC ${participantId}] Peer connection state changed to:`, peerConnection?.connectionState)
        setConnectionState(peerConnection?.connectionState || "new")

        // Handle failed connections with retry logic
        if (peerConnection?.connectionState === "failed") {
          console.warn(`[PC ${participantId}] Connection failed, recreating peer connection`)
          
          // Close and remove the failed connection
          peerConnection.close()
          peerConnections.current.delete(participantId)
          
          // Wait a bit then recreate the connection
          setTimeout(async () => {
            if (localStreamRef.current && signalingRef.current) {
              console.log(`[PC ${participantId}] Recreating connection after failure`)
              const newPeerConnection = createPeerConnection(participantId, localStreamRef.current)
              try {
                const offer = await newPeerConnection.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                })
                await newPeerConnection.setLocalDescription(offer)
                signalingRef.current.emit("offer", { 
                  offer, 
                  targetId: participantId, 
                  senderId: signalingRef.current.id 
                })
                console.log(`[PC ${participantId}] Recovery offer sent`)
              } catch (e) {
                console.error(`[PC ${participantId}] Recovery failed:`, e)
              }
            }
          }, 2000)
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
    (roomId: string, userName: string, stream: MediaStream, userId?: string) => {
      const socket = io(SIGNALING_SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: 5, // Increased for mobile
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000, // Increased to 20s for mobile networks
        transports: ["websocket", "polling"],
        upgrade: true,
        forceNew: true,
        autoConnect: true,
        // Mobile-friendly settings
        path: "/socket.io/",
        withCredentials: true,
      })

      socket.on("connect", () => {
        console.log("[Socket] Connected:", socket.id)
        setLocalParticipantId(socket.id || null)
        setIsConnected(true)
        setIsReconnecting(false)
        setError(null)
        
        // Clear ALL state when connecting to prevent duplicates
        setParticipants([])
        // Close all existing peer connections
        peerConnections.current.forEach((pc) => {
          pc.close()
        })
        peerConnections.current.clear()
        console.log("[Socket] Cleared all participants and peer connections")
        
        // Join room with extended timeout for mobile
        const joinTimeout = setTimeout(() => {
          console.warn("[Socket] Join room timeout - retrying...")
          setError("Connection slow. Retrying...")
          socket.emit("join-room", { roomId, userName, userId })
        }, 10000) // Increased to 10s for mobile
        
        socket.emit("join-room", { roomId, userName, userId })
        socket.once("current-participants", () => {
          clearTimeout(joinTimeout)
          console.log("[Socket] Successfully joined room")
        })
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
        console.log(`[Socket] User joined: ${participant.name} (${participant.id}), isHost: ${participant.isHost}`)
        // Don't add local participant to remote participants list
        if (participant.id === socket.id) {
          console.log(`[Socket] Ignoring local participant ${participant.id}`)
          return
        }
        
        setParticipants((prev) => {
          // Check if participant already exists
          const exists = prev.find(p => p.id === participant.id)
          if (exists) {
            console.log(`[Socket] Participant ${participant.id} already exists, updating...`)
            return prev.map(p => p.id === participant.id ? { 
              ...participant, 
              stream: p.stream, 
              status: "online",
              isHost: participant.isHost // Use server's host status
            } : p)
          }
          return [...prev, { 
            ...participant, 
            stream: undefined, 
            status: "online",
            isHost: participant.isHost // Use server's host status
          }]
        })

        // Create peer connection and send offer immediately
        // The new user will receive this and send back an answer
        if (stream && stream.getTracks().length > 0) {
          const peerConnection = createPeerConnection(participant.id, stream)
          try {
            const offer = await peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await peerConnection.setLocalDescription(offer)
            socket.emit("offer", { offer, targetId: participant.id })
            console.log(`[Socket] ✅ Offer sent to ${participant.id}`)
          } catch (e) {
            console.error(`[Socket] ❌ Offer error:`, e)
          }
        }
      })

      socket.on("join-error", ({ message }) => {
        console.error("[Socket] Join error:", message)
        setError(message)
        setIsConnected(false)
        setTimeout(() => leaveRoom(), 2000)
      })

      socket.on("current-participants", async (currentParticipants) => {
        console.log("[Socket] Received existing participants:", currentParticipants.length, currentParticipants)
        // Filter out local participant and replace participants list completely
        const remoteParticipants = currentParticipants.filter((p: any) => p.id !== socket.id)
        setParticipants(remoteParticipants.map((p: any) => ({ 
          ...p, 
          stream: undefined, 
          status: "online",
          isHost: p.isHost // Use server's host status
        })))
        
        // Check if any remote participant is host, if not, we might be the host
        const remoteHostExists = remoteParticipants.some((p: any) => p.isHost)
        if (!remoteHostExists) {
          setIsLocalHost(true)
          console.log('[Socket] No remote host found, local user is host')
        }

        // Don't send offers here - existing users will send offers when they receive user-joined event
        // Just create peer connections ready to receive offers
        remoteParticipants.forEach((participant: any) => {
          createPeerConnection(participant.id, stream)
          console.log(`[Socket] Created peer connection for existing user ${participant.id}, waiting for offer`)
        })
      })

      socket.on("user-left", ({ participantId, userName: leftUserName, reason }) => {
        console.log(`[Socket] ⚠️ USER LEFT EVENT RECEIVED: ${leftUserName} (${participantId}), Reason: ${reason || 'unknown'}`)
        console.log(`[Socket] Current participants before removal:`, participants.map(p => `${p.name}(${p.id})`).join(', '))
        
        // Immediately remove from participants - use callback to ensure we have latest state
        setParticipants((prev) => {
          const filtered = prev.filter((p) => p.id !== participantId)
          console.log(`[Socket] ✅ Participants before: ${prev.length}, after: ${filtered.length}`)
          console.log(`[Socket] Removed IDs:`, prev.filter(p => p.id === participantId).map(p => p.id))
          return filtered
        })
        
        // Close and cleanup peer connection immediately
        const pc = peerConnections.current.get(participantId)
        if (pc) {
          console.log(`[Socket] Closing peer connection for ${participantId}`)
          pc.close()
          peerConnections.current.delete(participantId)
        }
        
        // Remove from speaking participants
        setSpeakingParticipants((prev) => {
          const newSet = new Set(prev)
          newSet.delete(participantId)
          return newSet
        })
        
        // Clear screen sharing if this participant was sharing
        setScreenSharingParticipantId((prev) => prev === participantId ? null : prev)
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
          socket.emit("answer", { answer, targetId: senderId, senderId: socket.id || "" })
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
        console.log(`[Socket] Received ICE candidate from ${senderId}:`, candidate.type)
        const peerConnection = peerConnections.current.get(senderId)
        if (peerConnection) {
          try {
            // Check if we can add the candidate
            if (peerConnection.remoteDescription) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              console.log(`[Socket] ✅ Added ICE candidate for ${senderId}`)
            } else {
              console.warn(`[Socket] ⏳ No remote description yet for ${senderId}, candidate may be queued`)
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            }
          } catch (e) {
            console.error(`[Socket] ❌ Error adding ICE candidate for ${senderId}:`, e)
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

      socket.on("host-changed", ({ newHostId, newHostName, participants: hostUpdates }) => {
        console.log(`[Socket] Host changed to ${newHostName} (${newHostId})`)
        // Update local host status
        setIsLocalHost(newHostId === socket.id)
        // Update all participants' host status based on server's authoritative data
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isHost: p.id === newHostId,
          })),
        )
        
        // Show toast notification
        import('sonner').then(({ toast }) => {
          toast.info(`${newHostName} is now the host`, {
            duration: 3000,
            icon: '👑',
          })
        })
      })

      // New event: Host status update (for when new host joins)
      socket.on("host-status-update", ({ hostId, hostName }) => {
        console.log(`[Socket] Host status update: ${hostName} (${hostId}) is the host`)
        // Update local host status
        setIsLocalHost(hostId === socket.id)
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isHost: p.id === hostId,
          })),
        )
      })

      // Host control events
      socket.on("participant-force-muted", ({ participantId, mute }) => {
        if (participantId === socket.id && localStream) {
          const audioTrack = localStream.getAudioTracks()[0]
          if (audioTrack) {
            audioTrack.enabled = !mute
          }
        }
        setParticipants(prev => 
          prev.map(p => p.id === participantId ? { ...p, isMuted: mute } : p)
        )
      })

      socket.on("participant-force-video-toggle", ({ participantId, videoOff }) => {
        if (participantId === socket.id && localStream) {
          const videoTrack = localStream.getVideoTracks()[0]
          if (videoTrack) {
            videoTrack.enabled = !videoOff
          }
        }
        setParticipants(prev => 
          prev.map(p => p.id === participantId ? { ...p, isVideoOff: videoOff } : p)
        )
      })

      socket.on("participant-renamed", ({ participantId, newName }) => {
        setParticipants(prev => 
          prev.map(p => p.id === participantId ? { ...p, name: newName } : p)
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
        console.error("[Socket] Connection error:", err.message)
        setError("Connection failed. Retrying...")
        setIsConnected(false)
        setIsReconnecting(true)
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

      // Screen sharing events
      socket.on("screen-share-started", ({ participantId }) => {
        console.log(`[Socket] ${participantId} started screen sharing`)
        setScreenSharingParticipantId(participantId)
      })

      socket.on("screen-share-stopped", ({ participantId }) => {
        console.log(`[Socket] ${participantId} stopped screen sharing`)
        if (screenSharingParticipantId === participantId) {
          setScreenSharingParticipantId(null)
        }
      })

      // Host spotlight events
      socket.on("participant-spotlighted", ({ participantId, participantName }) => {
        console.log(`[Socket] ${participantName} (${participantId}) was spotlighted`)
        setScreenSharingParticipantId(participantId)
        import('sonner').then(({ toast }) => {
          toast.info(`${participantName} is now in spotlight`, {
            duration: 3000,
            icon: '🌟',
          })
        })
      })

      socket.on("spotlight-removed", () => {
        console.log(`[Socket] Spotlight removed`)
        setScreenSharingParticipantId(null)
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
    setIsLocalHost(false)
    setIsVirtualBackgroundEnabled(false)
    setIsReconnecting(false)
    setBufferedChatMessages([])
    setSpeakingParticipants(new Set())

    console.log("Left room")
  }, []) // IMPORTANT: Empty dependency array makes this callback stable

  // Join room
  const joinRoom = useCallback(
    async (roomId: string, userName: string, userId?: string) => {
      try {
        setError(null)
        roomIdRef.current = roomId
        userNameRef.current = userName

        // Check if this is a scheduled meeting
        try {
          const response = await fetch(`${SIGNALING_SERVER_URL}/api/meetings/check/${roomId}`)
          if (response.ok) {
            const { meeting } = await response.json()
            if (meeting.status === 'upcoming') {
              const meetingTime = new Date(meeting.scheduledTime)
              const timeUntil = Math.ceil((meetingTime.getTime() - Date.now()) / (1000 * 60))
              throw new Error(`Meeting hasn't started yet. Scheduled for ${meetingTime.toLocaleString()}. Please wait ${timeUntil} minute${timeUntil !== 1 ? 's' : ''}.`)
            } else if (meeting.status === 'ended') {
              throw new Error('This meeting has already ended.')
            }
          }
        } catch (err: any) {
          if (err.message && (err.message.includes('Meeting') || err.message.includes('scheduled') || err.message.includes('ended'))) {
            setError(err.message)
            throw err
          }
          // If meeting check fails (404), continue - might be instant meeting
        }

        const stream = await initializeLocalStream()
        setupSignaling(roomId, userName, stream, userId)

        console.log(`Attempting to join room ${roomId} as ${userName}${userId ? ` (userId: ${userId})` : ''}`)
      } catch (err: any) {
        console.error("Failed to join room:", err)
        if (!err.message?.includes('Meeting')) {
          setError("Failed to join room. Check camera/mic permissions or server connection.")
        }
        throw err
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

  // Remote audio level detection
  const setupRemoteAudioLevelDetection = useCallback(
    (stream: MediaStream, participantId: string) => {
      try {
        const audioTrack = stream.getAudioTracks()[0]
        if (!audioTrack) return

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return

        const audioContext = new AudioContextClass()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const checkRemoteAudioLevel = () => {
          if (!analyser) return

          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length

          const isAudioEnabled = audioTrack?.enabled || false
          const isSpeaking = average > 30 && isAudioEnabled

          setSpeakingParticipants((prev) => {
            const newSet = new Set(prev)
            if (isSpeaking) {
              newSet.add(participantId)
            } else {
              newSet.delete(participantId)
            }
            return newSet
          })

          requestAnimationFrame(checkRemoteAudioLevel)
        }

        checkRemoteAudioLevel()
      } catch (error) {
        console.error(`Failed to setup remote audio level detection for ${participantId}:`, error)
      }
    },
    [],
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
        videoTrack.enabled = !videoTrack.enabled
        const isVideoOff = !videoTrack.enabled

        console.log(`Local video toggled: ${videoTrack.enabled ? "on" : "off"}, isVideoOff: ${isVideoOff}`)

        // Force stream update to trigger re-render
        setLocalStream(new MediaStream(localStream.getTracks()))

        // Update local participant state immediately
        setParticipants((prev) =>
          prev.map((p) => (p.id === signalingRef.current?.id ? { ...p, isVideoOff } : p)),
        )

        // Emit to other participants
        if (signalingRef.current && signalingRef.current.connected) {
          signalingRef.current.emit("user-video-toggled", {
            participantId: signalingRef.current.id,
            isVideoOff,
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
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30 },
        },
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
      setScreenSharingParticipantId(null)
      
      // Notify other participants that screen sharing stopped
      if (signalingRef.current) {
        signalingRef.current.emit("screen-share-stopped", { participantId: localParticipantId })
      }
      
      console.log("Screen sharing stopped, camera restored.")
    } catch (err) {
      console.error("Failed to stop screen sharing or get camera back:", err)
      setError("Failed to stop screen sharing or restore camera. Please refresh.")
    }
  }, [localStream, localParticipantId])

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
      setScreenSharingParticipantId(localParticipantId)
      
      // Notify other participants about screen sharing
      if (signalingRef.current) {
        signalingRef.current.emit("screen-share-started", { participantId: localParticipantId })
      }
      
      console.log("Screen sharing started.")

      screenVideoTrack.onended = () => {
        console.log("Screen share ended by user.")
        stopScreenShare()
      }
    } catch (err) {
      console.error("Failed to start screen sharing:", err)
      setError("Failed to start screen sharing. Please check permissions.")
    }
  }, [localStream, stopScreenShare, localParticipantId])

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
    isLocalHost,
    isVirtualBackgroundEnabled,
    isReconnecting,
    bufferedChatMessages,
    networkQuality,
    bandwidth,
    speakingParticipants,
    screenSharingParticipantId,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleRaiseHand,
    sendReaction,
    toggleVirtualBackground,
    applyVirtualBackground: (stream: MediaStream | null) => {
      setVirtualBackgroundStream(stream)
      setIsVirtualBackgroundEnabled(!!stream)
      
      // Update peer connections with new stream
      if (stream && peerConnections.current.size > 0) {
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          peerConnections.current.forEach((pc) => {
            const videoSender = pc.getSenders().find((s) => s.track?.kind === "video")
            if (videoSender) {
              videoSender.replaceTrack(videoTrack)
            }
          })
        }
      }
    },
    startScreenShare,
    stopScreenShare,
    sendMessage,
    getParticipantById,
    signalingRef,
    setBufferedChatMessages,
  }
}
