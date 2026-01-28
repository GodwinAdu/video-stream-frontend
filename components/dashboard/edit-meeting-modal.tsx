"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, Users, Video, X, Trash2 } from "lucide-react"
import { Meeting } from "@/lib/meetings"

interface EditMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (meeting: Meeting) => void
  onDelete: (meetingId: string) => void
  meeting: Meeting | null
}

export default function EditMeetingModal({ isOpen, onClose, onUpdate, onDelete, meeting }: EditMeetingModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "30",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isRecurring: false,
    recurringType: "weekly",
    requiresPassword: false,
    password: "",
    waitingRoom: true,
    allowRecording: true,
  })

  useEffect(() => {
    if (meeting) {
      const scheduledDate = new Date(meeting.scheduledTime)
      setFormData({
        title: meeting.title,
        description: meeting.description || "",
        date: scheduledDate.toISOString().split('T')[0],
        time: scheduledDate.toTimeString().slice(0, 5),
        duration: meeting.duration.toString(),
        timezone: meeting.timezone,
        isRecurring: meeting.isRecurring,
        recurringType: meeting.recurringType || "weekly",
        requiresPassword: meeting.requiresPassword,
        password: meeting.password || "",
        waitingRoom: meeting.waitingRoom,
        allowRecording: meeting.allowRecording,
      })
    }
  }, [meeting])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meeting) return
    
    const scheduledTime = new Date(`${formData.date}T${formData.time}`)
    const updatedMeeting = {
      ...meeting,
      title: formData.title,
      description: formData.description,
      scheduledTime: scheduledTime.toISOString(),
      duration: parseInt(formData.duration),
      timezone: formData.timezone,
      isRecurring: formData.isRecurring,
      recurringType: formData.recurringType,
      requiresPassword: formData.requiresPassword,
      password: formData.password,
      waitingRoom: formData.waitingRoom,
      allowRecording: formData.allowRecording,
    }
    
    onUpdate(updatedMeeting)
    onClose()
  }

  const handleDelete = () => {
    if (meeting && confirm('Are you sure you want to delete this meeting?')) {
      onDelete(meeting._id || meeting.id!)
      onClose()
    }
  }

  if (!meeting) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-400" />
            Edit Meeting
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-gray-300">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter meeting title"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting agenda or description"
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-gray-300">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-gray-300">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Duration</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Timezone</Label>
              <Input
                value={formData.timezone}
                readOnly
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Recurring Meeting</Label>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
              />
            </div>

            {formData.isRecurring && (
              <div>
                <Label className="text-gray-300">Repeat</Label>
                <Select value={formData.recurringType} onValueChange={(value) => setFormData(prev => ({ ...prev, recurringType: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Video className="w-4 h-4 mr-2" />
              Meeting Settings
            </h3>

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Require Password</Label>
              <Switch
                checked={formData.requiresPassword}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresPassword: checked }))}
              />
            </div>

            {formData.requiresPassword && (
              <div>
                <Label htmlFor="password" className="text-gray-300">Meeting Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter meeting password"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Enable Waiting Room</Label>
              <Switch
                checked={formData.waitingRoom}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, waitingRoom: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Allow Recording</Label>
              <Switch
                checked={formData.allowRecording}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowRecording: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              Update Meeting
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}