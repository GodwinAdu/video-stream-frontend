"use client"

import { useState, useRef, useEffect } from "react"
import { X, Upload, File, Download, Trash2, FileText, Image, FileVideo, FileAudio, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface SharedFile {
    id: string
    name: string
    size: number
    type: string
    uploadedBy: string
    uploadedAt: string
    url?: string
}

interface FileSharingPanelProps {
    onClose: () => void
    signalingRef: any
    localParticipantId: string | null
    participants: any[]
}

export default function FileSharingPanel({
    onClose,
    signalingRef,
    localParticipantId,
    participants,
}: FileSharingPanelProps) {
    const [files, setFiles] = useState<SharedFile[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!signalingRef.current) return

        const socket = signalingRef.current

        socket.on("file-shared", ({ file }: { file: SharedFile }) => {
            setFiles(prev => [...prev, file])
        })

        socket.on("file-deleted", ({ fileId }: { fileId: string }) => {
            setFiles(prev => prev.filter(f => f.id !== fileId))
        })

        return () => {
            socket.off("file-shared")
            socket.off("file-deleted")
        }
    }, [signalingRef])

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFiles = Array.from(e.dataTransfer.files)
        uploadFiles(droppedFiles)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            uploadFiles(selectedFiles)
        }
    }

    const uploadFiles = async (filesToUpload: File[]) => {
        for (const file of filesToUpload) {
            const fileId = `file-${Date.now()}-${Math.random()}`

            // Simulate upload progress
            setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

            // Convert file to base64 for transmission
            const reader = new FileReader()
            reader.onload = () => {
                const sharedFile: SharedFile = {
                    id: fileId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedBy: localParticipantId || "Unknown",
                    uploadedAt: new Date().toISOString(),
                    url: reader.result as string,
                }

                // Simulate progress
                let progress = 0
                const interval = setInterval(() => {
                    progress += 10
                    setUploadProgress(prev => ({ ...prev, [fileId]: progress }))

                    if (progress >= 100) {
                        clearInterval(interval)
                        setTimeout(() => {
                            setUploadProgress(prev => {
                                const newProgress = { ...prev }
                                delete newProgress[fileId]
                                return newProgress
                            })
                        }, 500)

                        // Share file with others
                        if (signalingRef.current) {
                            signalingRef.current.emit("share-file", { file: sharedFile })
                        }

                        setFiles(prev => [...prev, sharedFile])
                    }
                }, 100)
            }

            reader.readAsDataURL(file)
        }
    }

    const deleteFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId))

        if (signalingRef.current) {
            signalingRef.current.emit("delete-file", { fileId })
        }
    }

    const downloadFile = (file: SharedFile) => {
        if (!file.url) return

        const link = document.createElement("a")
        link.href = file.url
        link.download = file.name
        link.click()
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-400" />
        if (type.startsWith("video/")) return <FileVideo className="w-5 h-5 text-purple-400" />
        if (type.startsWith("audio/")) return <FileAudio className="w-5 h-5 text-green-400" />
        if (type.includes("pdf") || type.includes("document")) return <FileText className="w-5 h-5 text-red-400" />
        if (type.includes("zip") || type.includes("rar")) return <Archive className="w-5 h-5 text-yellow-400" />
        return <File className="w-5 h-5 text-gray-400" />
    }

    const getUploaderName = (uploaderId: string) => {
        if (uploaderId === localParticipantId) return "You"
        return participants.find(p => p.id === uploaderId)?.name || "Unknown"
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">File Sharing</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Upload Area */}
            <div className="p-4 border-b border-gray-700">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging ? "border-blue-400 bg-blue-400/10" : "border-gray-700 hover:border-gray-600"
                    }`}
                >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400 mb-2">Drag and drop files here</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Browse Files
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                {/* Upload Progress */}
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{progress}%</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                ))}
            </div>

            {/* Files List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {files.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No files shared yet</p>
                            <p className="text-sm mt-2">Upload files to share with participants</p>
                        </div>
                    ) : (
                        files.map(file => (
                            <div
                                key={file.id}
                                className="bg-gray-800 rounded-lg p-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
                            >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    {getFileIcon(file.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{getUploaderName(file.uploadedBy)}</span>
                                            <span>•</span>
                                            <span>{new Date(file.uploadedAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadFile(file)}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    {file.uploadedBy === localParticipantId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteFile(file.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                    {files.length} file{files.length !== 1 ? "s" : ""} shared • Max 10MB per file
                </p>
            </div>
        </div>
    )
}
