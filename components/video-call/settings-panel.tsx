"use client"

import { useState, useEffect } from "react"
import { X, Mic, Video, Monitor, Wifi, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface SettingsPanelProps {
  onClose: () => void
}

interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: string
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [microphoneVolume, setMicrophoneVolume] = useState([75])
  const [speakerVolume, setSpeakerVolume] = useState([80])
  const [cameraQuality, setCameraQuality] = useState("720p")
  const [microphoneDevice, setMicrophoneDevice] = useState("default")
  const [cameraDevice, setCameraDevice] = useState("default")
  const [speakerDevice, setSpeakerDevice] = useState("default")
  const [echoCancellation, setEchoCancellation] = useState(true)
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  const [autoGainControl, setAutoGainControl] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)
  const [theme, setTheme] = useState("dark")
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [networkStats, setNetworkStats] = useState({
    quality: "Excellent",
    latency: "45ms",
    upload: "2.1 Mbps",
    download: "15.3 Mbps"
  })

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('meeting-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setMicrophoneVolume([settings.microphoneVolume || 75])
      setSpeakerVolume([settings.speakerVolume || 80])
      setCameraQuality(settings.cameraQuality || "720p")
      setEchoCancellation(settings.echoCancellation ?? true)
      setNoiseSuppression(settings.noiseSuppression ?? true)
      setAutoGainControl(settings.autoGainControl ?? true)
      setNotifications(settings.notifications ?? true)
      setSoundEffects(settings.soundEffects ?? true)
      setTheme(settings.theme || "dark")
    }
    enumerateDevices()
  }, [])

  // Enumerate media devices
  const enumerateDevices = async () => {
    try {
      setIsLoading(true)
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      setDevices(deviceList.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind
      })))
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
      toast.error('Failed to load media devices')
    } finally {
      setIsLoading(false)
    }
  }

  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      microphoneVolume: microphoneVolume[0],
      speakerVolume: speakerVolume[0],
      cameraQuality,
      microphoneDevice,
      cameraDevice,
      speakerDevice,
      echoCancellation,
      noiseSuppression,
      autoGainControl,
      notifications,
      soundEffects,
      theme
    }
    localStorage.setItem('meeting-settings', JSON.stringify(settings))
    toast.success('Settings saved successfully')
  }

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const audioInputs = devices.filter(d => d.kind === 'audioinput')
  const videoInputs = devices.filter(d => d.kind === 'videoinput')
  const audioOutputs = devices.filter(d => d.kind === 'audiooutput')

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-700 shadow-xl z-50 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Audio Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Microphone</Label>
                <Select value={microphoneDevice} onValueChange={setMicrophoneDevice}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Microphone</SelectItem>
                    {audioInputs.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Microphone Volume</Label>
                <Slider
                  value={microphoneVolume}
                  onValueChange={setMicrophoneVolume}
                  max={100}
                  step={1}
                  className="mt-2"
                />
                <div className="text-xs text-gray-400 mt-1">{microphoneVolume[0]}%</div>
              </div>

              <div>
                <Label className="text-gray-300">Speaker</Label>
                <Select value={speakerDevice} onValueChange={setSpeakerDevice}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Speaker</SelectItem>
                    {audioOutputs.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Speaker Volume</Label>
                <Slider value={speakerVolume} onValueChange={setSpeakerVolume} max={100} step={1} className="mt-2" />
                <div className="text-xs text-gray-400 mt-1">{speakerVolume[0]}%</div>
              </div>

              <Separator className="bg-gray-600" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Echo Cancellation</Label>
                  <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Noise Suppression</Label>
                  <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Auto Gain Control</Label>
                  <Switch checked={autoGainControl} onCheckedChange={setAutoGainControl} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Camera</Label>
                <Select value={cameraDevice} onValueChange={setCameraDevice}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Camera</SelectItem>
                    {videoInputs.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Video Quality</Label>
                <Select value={cameraQuality} onValueChange={setCameraQuality}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-600" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Notifications</Label>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Sound Effects</Label>
                  <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Network
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Simulate network test
                    setIsLoading(true)
                    setTimeout(() => {
                      setNetworkStats({
                        quality: Math.random() > 0.5 ? "Excellent" : "Good",
                        latency: `${Math.floor(Math.random() * 100 + 20)}ms`,
                        upload: `${(Math.random() * 5 + 1).toFixed(1)} Mbps`,
                        download: `${(Math.random() * 20 + 10).toFixed(1)} Mbps`
                      })
                      setIsLoading(false)
                    }, 2000)
                  }}
                  className="ml-auto"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Connection Quality:</span>
                <span className={networkStats.quality === "Excellent" ? "text-green-400" : "text-yellow-400"}>
                  {networkStats.quality}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Latency:</span>
                <span className="text-white">{networkStats.latency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Upload:</span>
                <span className="text-white">{networkStats.upload}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Download:</span>
                <span className="text-white">{networkStats.download}</span>
              </div>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex space-x-2">
            <Button onClick={saveSettings} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            <Button variant="outline" onClick={enumerateDevices} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
