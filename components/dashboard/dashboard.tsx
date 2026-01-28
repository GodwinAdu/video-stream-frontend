"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Plus, 
  Copy, 
  Edit, 
  Play,
  BarChart3,
  Shield,
  Crown
} from "lucide-react"
import { getAuth } from "@/lib/auth"
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, type Meeting } from "@/lib/meetings"
import { getMeetingStatus, getTimeUntilMeeting, generateMeetingInvite } from "@/lib/meeting-utils"
import UserDropdown from "./user-dropdown"
import ProfileModal from "./profile-modal"
import ChangePasswordModal from "./change-password-modal"
import ScheduleMeetingModal from "./schedule-meeting-modal"
import EditMeetingModal from "./edit-meeting-modal"



interface DashboardProps {
  onStartMeeting: (roomId: string, userName: string) => void
  onJoinMeeting: () => void
}

export default function Dashboard({ onStartMeeting, onJoinMeeting }: DashboardProps) {
  const [user, setUser] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    if (auth) {
      setUser(auth.user)
      loadMeetings()
    }
  }, [])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const fetchedMeetings = await getMeetings()
      setMeetings(fetchedMeetings)
    } catch (error) {
      console.error('Failed to load meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const startInstantMeeting = () => {
    const roomId = user?.personalRoomId || `room-${Date.now()}`
    const userName = user?.name || 'User'
    onStartMeeting(roomId, userName)
  }

  const handleScheduleMeeting = () => {
    setShowScheduleModal(true)
  }

  const handleMeetingScheduled = async (meetingData: any) => {
    try {
      const meeting = await createMeeting(meetingData)
      setMeetings(prev => [...prev, meeting])
    } catch (error) {
      console.error('Failed to create meeting:', error)
      alert('Failed to create meeting')
    }
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setShowEditModal(true)
  }

  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    try {
      const meeting = await updateMeeting(updatedMeeting._id || updatedMeeting.id!, updatedMeeting)
      setMeetings(prev => prev.map(m => 
        (m._id === meeting._id || m.id === meeting.id) ? meeting : m
      ))
    } catch (error) {
      console.error('Failed to update meeting:', error)
      alert('Failed to update meeting')
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId)
      setMeetings(prev => prev.filter(m => m._id !== meetingId && m.id !== meetingId))
    } catch (error) {
      console.error('Failed to delete meeting:', error)
      alert('Failed to delete meeting')
    }
  }

  const handleStartMeeting = (meeting: Meeting) => {
    // Apply meeting settings before starting
    const roomId = meeting.meetingId || meeting.roomId || `room-${Date.now()}`
    const userName = user?.name || 'Host'
    
    // Store meeting settings for the room
    localStorage.setItem(`meeting_settings_${roomId}`, JSON.stringify({
      waitingRoom: meeting.waitingRoom,
      requiresPassword: meeting.requiresPassword,
      password: meeting.password,
      allowRecording: meeting.allowRecording
    }))
    
    onStartMeeting(roomId, userName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">VideoStream Pro</h1>
                <p className="text-xs text-gray-400">Professional Video Meetings</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                <Crown className="w-3 h-3 mr-1" />
                {user?.subscription?.plan || 'Free'} Plan
              </Badge>
              <UserDropdown
                user={user}
                onLogout={async () => {
                  const { logout } = await import('@/lib/auth')
                  await logout()
                  window.location.reload()
                }}
                onProfileUpdate={() => setShowProfileModal(true)}
                onChangePassword={() => setShowPasswordModal(true)}
                onSettings={() => setShowSettings(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Start Instant Meeting</h3>
                  <p className="text-blue-100 text-sm">Begin a meeting right now</p>
                </div>
                <Video className="w-8 h-8 text-blue-200" />
              </div>
              <Button 
                onClick={startInstantMeeting}
                className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Join Meeting</h3>
                  <p className="text-green-100 text-sm">Enter a meeting ID to join</p>
                </div>
                <Users className="w-8 h-8 text-green-200" />
              </div>
              <Button 
                onClick={onJoinMeeting}
                className="w-full mt-4 bg-white text-green-600 hover:bg-green-50"
              >
                Join Meeting
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-2">Schedule Meeting</h3>
                  <p className="text-purple-100 text-sm">Plan a future meeting</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-200" />
              </div>
              <Button 
                onClick={handleScheduleMeeting}
                className="w-full mt-4 bg-white text-purple-600 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Personal Meeting Room */}
        <Card className="mb-8 bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-400" />
              Personal Meeting Room
            </CardTitle>
            <CardDescription>
              Your permanent meeting space - same ID every time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Meeting ID</p>
                <code className="text-lg font-mono text-blue-400">
                  {user?.personalRoomId || `room-${Date.now()}`}
                </code>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const roomId = user?.personalRoomId || `room-${Date.now()}`
                    navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
                  }}
                  className="border-gray-600 text-gray-300"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={startInstantMeeting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="meetings" className="space-y-6">
          <TabsList className="bg-gray-800/50 border-gray-700">
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="meetings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Upcoming Meetings</h2>
              <Button 
                onClick={handleScheduleMeeting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
            
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading meetings...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No meetings scheduled</h3>
                  <p className="text-gray-500">Create your first meeting to get started</p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <Card key={meeting._id || meeting.id} className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-white">{meeting.title}</h3>
                            <div className="flex items-center space-x-2">
                              {meeting.isRecurring && (
                                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
                                  Recurring
                                </Badge>
                              )}
                              {meeting.requiresPassword && (
                                <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                                  Password
                                </Badge>
                              )}
                              {meeting.waitingRoom && (
                                <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                                  Waiting Room
                                </Badge>
                              )}
                            </div>
                          </div>
                          {meeting.description && (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{meeting.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(meeting.scheduledTime).toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              Duration: {meeting.duration}min
                            </div>
                            <div className="flex items-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                getMeetingStatus(meeting) === 'active' ? 'bg-green-600/20 text-green-300' :
                                getMeetingStatus(meeting) === 'upcoming' ? 'bg-blue-600/20 text-blue-300' :
                                'bg-gray-600/20 text-gray-400'
                              }`}>
                                {getMeetingStatus(meeting) === 'active' ? 'Active' :
                                 getMeetingStatus(meeting) === 'upcoming' ? getTimeUntilMeeting(meeting) :
                                 'Ended'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => {
                              const invite = generateMeetingInvite(meeting, user?.name || 'Host')
                              navigator.clipboard.writeText(invite)
                              alert('Meeting invite copied to clipboard!')
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => handleEditMeeting(meeting)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            className={`${
                              getMeetingStatus(meeting) === 'ended' 
                                ? 'bg-gray-600 hover:bg-gray-700 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            onClick={() => handleStartMeeting(meeting)}
                            disabled={getMeetingStatus(meeting) === 'ended'}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {getMeetingStatus(meeting) === 'active' ? 'Join' : 'Start'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="recordings">
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No recordings yet</h3>
              <p className="text-gray-500">Your meeting recordings will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Meetings</p>
                      <p className="text-2xl font-bold text-white">24</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUpdate={(data) => {
          // Update user data
          setUser(prev => ({ ...prev, ...data }))
          // Update localStorage
          localStorage.setItem('auth_user', JSON.stringify({ ...user, ...data }))
        }}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleMeetingScheduled}
      />

      <EditMeetingModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedMeeting(null)
        }}
        onUpdate={handleUpdateMeeting}
        onDelete={handleDeleteMeeting}
        meeting={selectedMeeting}
      />
    </div>
  )
}