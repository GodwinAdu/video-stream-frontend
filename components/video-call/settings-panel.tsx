"use client"

import { X, Camera, Mic, Monitor, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface SettingsPanelProps {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-50 text-lg">Settings</h3>
            <p className="text-xs text-gray-400">Customize your meeting experience</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-gray-400 hover:text-gray-50 hover:bg-gray-800/50 rounded-xl">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Enhanced Settings Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-8">
          {/* Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-gray-400" />
              <h4 className="font-medium text-gray-50">Audio</h4>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm text-gray-300">Microphone</Label>
                <Select defaultValue="default">
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-50 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-50">
                    <SelectItem value="default">Default - Built-in Microphone</SelectItem>
                    <SelectItem value="external">External USB Microphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-300">Speaker</Label>
                <Select defaultValue="default">
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-50 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-50">
                    <SelectItem value="default">Default - Built-in Speakers</SelectItem>
                    <SelectItem value="headphones">Bluetooth Headphones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-300">Volume</Label>
                <Slider defaultValue={[80]} max={100} step={1} className="mt-2" />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Echo Cancellation</Label>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Noise Suppression</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-800" />

          {/* Video Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-gray-400" />
              <h4 className="font-medium text-gray-50">Video</h4>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm text-gray-300">Camera</Label>
                <Select defaultValue="default">
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-50 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-50">
                    <SelectItem value="default">Built-in Camera</SelectItem>
                    <SelectItem value="external">External Webcam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-gray-300">Resolution</Label>
                <Select defaultValue="720p">
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-50 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-50">
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">HD Video</Label>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Mirror Video</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-800" />

          {/* General Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-400" />
              <h4 className="font-medium text-gray-50">General</h4>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Join with mic muted</Label>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Join with camera off</Label>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Show connection quality</Label>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Enable keyboard shortcuts</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex space-x-3">
          <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800/50">
            Reset to Default
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
