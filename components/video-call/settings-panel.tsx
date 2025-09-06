"use client"

import { useState } from "react"
import { X, Mic, Video, Monitor, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface SettingsPanelProps {
  onClose: () => void
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
                    <SelectItem value="built-in">Built-in Microphone</SelectItem>
                    <SelectItem value="usb">USB Microphone</SelectItem>
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
                    <SelectItem value="built-in">Built-in Speaker</SelectItem>
                    <SelectItem value="headphones">Headphones</SelectItem>
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
                    <SelectItem value="built-in">Built-in Camera</SelectItem>
                    <SelectItem value="usb">USB Camera</SelectItem>
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
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Connection Quality:</span>
                <span className="text-green-400">Excellent</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Latency:</span>
                <span className="text-white">45ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Upload:</span>
                <span className="text-white">2.1 Mbps</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Download:</span>
                <span className="text-white">15.3 Mbps</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
