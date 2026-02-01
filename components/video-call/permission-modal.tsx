"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Mic, Shield, AlertCircle, CheckCircle } from "lucide-react"

interface PermissionModalProps {
    onPermissionsGranted: () => void
}

export default function PermissionModal({ onPermissionsGranted }: PermissionModalProps) {
    const [isRequesting, setIsRequesting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isChecking, setIsChecking] = useState(true)

    // Check if permissions are already granted
    useEffect(() => {
        const checkExistingPermissions = async () => {
            try {
                // Check if getUserMedia is supported
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError("Your browser doesn't support camera and microphone access.")
                    setIsChecking(false)
                    return
                }

                // Check if permissions are already granted by trying to get media
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                // Stop the stream immediately
                stream.getTracks().forEach(track => track.stop())
                // Permissions already granted, proceed directly
                localStorage.setItem('media-permissions-granted', 'true')
                onPermissionsGranted()
            } catch (err) {
                // Permissions not granted or error occurred
                console.log('Permissions check:', err)
                setIsChecking(false)
            }
        }

        // Check if we previously granted permissions
        const previouslyGranted = localStorage.getItem('media-permissions-granted')
        if (previouslyGranted === 'true') {
            checkExistingPermissions()
        } else {
            setIsChecking(false)
        }
    }, [])

    const requestPermissions = async () => {
        setIsRequesting(true)
        setError(null)
        
        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Media devices not supported")
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            // Stop the stream immediately since we just needed permission
            stream.getTracks().forEach(track => track.stop())
            // Save permission state
            localStorage.setItem('media-permissions-granted', 'true')
            onPermissionsGranted()
        } catch (err: any) {
            console.error("Permission error:", err)
            
            if (err instanceof DOMException) {
                switch (err.name) {
                    case "NotAllowedError":
                        setError("Please click 'Allow' when your browser asks for camera and microphone permissions.")
                        localStorage.removeItem('media-permissions-granted')
                        break
                    case "NotFoundError":
                        setError("No camera or microphone detected. Please connect your devices and try again.")
                        break
                    case "NotReadableError":
                        setError("Camera or microphone is being used by another application. Please close other apps and try again.")
                        break
                    case "OverconstrainedError":
                        setError("Camera or microphone doesn't meet requirements. Please try with different devices.")
                        break
                    case "SecurityError":
                        setError("Security error. Please ensure you're using HTTPS or localhost.")
                        break
                    default:
                        setError(`Device error: ${err.message}. Please check your camera and microphone.`)
                }
            } else if (err.message === "Media devices not supported") {
                setError("Your browser doesn't support camera and microphone access. Please use a modern browser.")
            } else {
                setError("Unable to access camera and microphone. Please check your browser settings and try again.")
            }
        } finally {
            setIsRequesting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-slate-50 text-2xl font-bold">Media Permissions</CardTitle>
                    <CardDescription className="text-slate-400 mt-2">
                        We need access to your camera and microphone to join the video call
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-xl">
                            <Camera className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="text-slate-200 font-medium">Camera Access</p>
                                <p className="text-slate-400 text-sm">Share your video with other participants</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-xl">
                            <Mic className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="text-slate-200 font-medium">Microphone Access</p>
                                <p className="text-slate-400 text-sm">Communicate with other participants</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <Button
                        onClick={requestPermissions}
                        disabled={isRequesting || isChecking}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg rounded-xl disabled:opacity-50"
                    >
                        {isChecking ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Checking Permissions...
                            </>
                        ) : isRequesting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Requesting Access...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Allow Camera & Microphone
                            </>
                        )}
                    </Button>

                    {error && (
                        <Button
                            variant="outline"
                            onClick={() => setError(null)}
                            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                            Try Again
                        </Button>
                    )}
                    
                    <p className="text-xs text-slate-500 text-center">
                        Your privacy is important. Media access is only used during video calls.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}