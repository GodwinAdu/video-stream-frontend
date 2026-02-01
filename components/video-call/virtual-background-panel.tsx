"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Circle, 
  Monitor,
  Download,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react"
import { VirtualBackgroundProcessor, VirtualBackgroundOptions, VIRTUAL_BACKGROUNDS } from "@/lib/virtual-background"

interface VirtualBackgroundPanelProps {
  onClose: () => void
  localStream: MediaStream | null
  onBackgroundChange: (stream: MediaStream | null) => void
}

export default function VirtualBackgroundPanel({ 
  onClose, 
  localStream, 
  onBackgroundChange 
}: VirtualBackgroundPanelProps) {
  const [processor] = useState(() => new VirtualBackgroundProcessor())
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentBackground, setCurrentBackground] = useState<VirtualBackgroundOptions>({ type: 'none' })
  const [customBackgrounds, setCustomBackgrounds] = useState<Array<{id: string, name: string, url: string, type: 'image' | 'video'}>>([])
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeProcessor()
    loadCustomBackgrounds()
    
    return () => {
      processor.dispose()
    }
  }, [])

  useEffect(() => {
    if (previewEnabled && localStream && previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStream
      startPreview()
    }
  }, [previewEnabled, localStream, currentBackground])

  const initializeProcessor = async () => {
    try {
      const initialized = await processor.initialize()
      setIsInitialized(initialized)
    } catch (error) {
      console.error('Failed to initialize virtual background:', error)
    }
  }

  const loadCustomBackgrounds = () => {
    const saved = localStorage.getItem('custom_backgrounds')
    if (saved) {
      setCustomBackgrounds(JSON.parse(saved))
    }
  }

  const saveCustomBackgrounds = (backgrounds: typeof customBackgrounds) => {
    localStorage.setItem('custom_backgrounds', JSON.stringify(backgrounds))
    setCustomBackgrounds(backgrounds)
  }

  const startPreview = () => {
    if (!previewVideoRef.current || !previewCanvasRef.current) return

    const video = previewVideoRef.current
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')!

    const updatePreview = () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        if (currentBackground.type === 'none') {
          ctx.drawImage(video, 0, 0)
        } else {
          const processed = processor.processFrame(video, currentBackground)
          ctx.drawImage(processed, 0, 0)
        }
      }
      
      if (previewEnabled) {
        requestAnimationFrame(updatePreview)
      }
    }

    video.addEventListener('loadeddata', updatePreview)
  }

  const applyBackground = async (options: VirtualBackgroundOptions) => {
    if (!localStream) return

    setIsProcessing(true)
    setCurrentBackground(options)

    try {
      if (options.type !== 'none') {
        await processor.setBackground(options)
        const processedStream = processor.getProcessedStream(localStream, options)
        onBackgroundChange(processedStream)
      } else {
        onBackgroundChange(localStream)
      }
    } catch (error) {
      console.error('Failed to apply background:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    
    if (!isVideo && !isImage) {
      alert('Please select an image or video file')
      return
    }

    const url = URL.createObjectURL(file)
    const newBackground = {
      id: Date.now().toString(),
      name: file.name.split('.')[0],
      url,
      type: isVideo ? 'video' as const : 'image' as const
    }

    saveCustomBackgrounds([...customBackgrounds, newBackground])
  }

  const removeCustomBackground = (id: string) => {
    const updated = customBackgrounds.filter(bg => bg.id !== id)
    saveCustomBackgrounds(updated)
  }

  const downloadBackground = async (url: string, name: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = name
      a.click()
      
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Failed to download background:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold flex items-center">
          <Monitor className="w-5 h-5 mr-2 text-blue-400" />
          Virtual Backgrounds
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewEnabled(!previewEnabled)}
            className="text-slate-400"
          >
            {previewEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview */}
      {previewEnabled && (
        <div className="p-4 border-b border-slate-700">
          <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
            <video
              ref={previewVideoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-0"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={previewCanvasRef}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="presets" className="h-full">
          <TabsList className="w-full bg-slate-800 border-slate-700">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="p-4 space-y-4">
            {/* None */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">No Background</Label>
              <Card 
                className={`p-3 cursor-pointer transition-all ${
                  currentBackground.type === 'none' 
                    ? 'bg-blue-600/20 border-blue-500' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                }`}
                onClick={() => applyBackground({ type: 'none' })}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-300" />
                  </div>
                  <span className="text-sm">None</span>
                </div>
              </Card>
            </div>

            {/* Blur */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Blur</Label>
              <div className="grid grid-cols-1 gap-2">
                {VIRTUAL_BACKGROUNDS.blur.map((blur, index) => (
                  <Card
                    key={index}
                    className={`p-3 cursor-pointer transition-all ${
                      currentBackground.type === 'blur' && currentBackground.blurAmount === blur.blurAmount
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                    onClick={() => applyBackground({ type: 'blur', blurAmount: blur.blurAmount })}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                        <Circle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm">{blur.name}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Images */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {VIRTUAL_BACKGROUNDS.images.map((image, index) => (
                  <Card
                    key={index}
                    className={`p-2 cursor-pointer transition-all ${
                      currentBackground.type === 'image' && currentBackground.imageUrl === image.url
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                    onClick={() => applyBackground({ type: 'image', imageUrl: image.url })}
                  >
                    <div className="aspect-video bg-gradient-to-br from-green-600 to-blue-600 rounded mb-2 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-center truncate">{image.name}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Videos */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Videos</Label>
              <div className="grid grid-cols-2 gap-2">
                {VIRTUAL_BACKGROUNDS.videos.map((video, index) => (
                  <Card
                    key={index}
                    className={`p-2 cursor-pointer transition-all ${
                      currentBackground.type === 'video' && currentBackground.videoUrl === video.url
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                    onClick={() => applyBackground({ type: 'video', videoUrl: video.url })}
                  >
                    <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded mb-2 flex items-center justify-center">
                      <VideoIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-center truncate">{video.name}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="p-4 space-y-4">
            {/* Upload */}
            <div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Background
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Custom Backgrounds */}
            {customBackgrounds.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {customBackgrounds.map((bg) => (
                  <Card
                    key={bg.id}
                    className={`p-2 cursor-pointer transition-all group ${
                      currentBackground.type === bg.type && 
                      (currentBackground.imageUrl === bg.url || currentBackground.videoUrl === bg.url)
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                    onClick={() => applyBackground({ 
                      type: bg.type, 
                      ...(bg.type === 'image' ? { imageUrl: bg.url } : { videoUrl: bg.url })
                    })}
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-600 to-gray-800 rounded mb-2 flex items-center justify-center relative">
                      {bg.type === 'image' ? (
                        <ImageIcon className="w-6 h-6 text-white" />
                      ) : (
                        <VideoIcon className="w-6 h-6 text-white" />
                      )}
                      
                      {/* Actions */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadBackground(bg.url, bg.name)
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCustomBackground(bg.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-center truncate">{bg.name}</p>
                  </Card>
                ))}
              </div>
            )}

            {customBackgrounds.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No custom backgrounds yet</p>
                <p className="text-sm">Upload images or videos to get started</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            {/* Blur Settings */}
            {currentBackground.type === 'blur' && (
              <div>
                <Label className="text-sm font-medium text-slate-300 mb-2 block">
                  Blur Amount: {currentBackground.blurAmount || 10}px
                </Label>
                <Slider
                  value={[currentBackground.blurAmount || 10]}
                  onValueChange={([value]) => {
                    const newBackground = { ...currentBackground, blurAmount: value }
                    setCurrentBackground(newBackground)
                    applyBackground(newBackground)
                  }}
                  max={30}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Performance */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Performance</Label>
              <div className="space-y-2 text-sm text-slate-400">
                <p>• MediaPipe: {isInitialized ? '✅ Available' : '❌ Not Available'}</p>
                <p>• Hardware Acceleration: {navigator.hardwareConcurrency > 4 ? '✅ Good' : '⚠️ Limited'}</p>
                <p>• Memory Usage: {(performance as any).memory ? 
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                  'Unknown'}</p>
              </div>
            </div>

            {/* Tips */}
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Tips</Label>
              <div className="space-y-1 text-xs text-slate-500">
                <p>• Use good lighting for better segmentation</p>
                <p>• Avoid busy backgrounds behind you</p>
                <p>• Keep movements smooth for best results</p>
                <p>• Custom videos should be under 10MB</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {isInitialized ? 'AI-powered segmentation' : 'Basic blur mode'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyBackground({ type: 'none' })}
            className="border-slate-600 text-slate-300"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}