import { Meeting } from './meetings'

export interface MeetingWithId extends Meeting {
  meetingId?: string
}

export const validateMeetingPassword = (meeting: Meeting, password: string): boolean => {
  if (!meeting.requiresPassword) return true
  return meeting.password === password
}

export const isMeetingActive = (meeting: Meeting): boolean => {
  const now = new Date()
  const meetingTime = new Date(meeting.scheduledTime)
  const endTime = new Date(meetingTime.getTime() + meeting.duration * 60000)
  
  return now >= meetingTime && now <= endTime
}

export const getMeetingStatus = (meeting: Meeting): 'upcoming' | 'active' | 'ended' => {
  const now = new Date()
  const meetingTime = new Date(meeting.scheduledTime)
  const endTime = new Date(meetingTime.getTime() + meeting.duration * 60000)
  
  if (now < meetingTime) return 'upcoming'
  if (now >= meetingTime && now <= endTime) return 'active'
  return 'ended'
}

export const getTimeUntilMeeting = (meeting: Meeting): string => {
  const now = new Date()
  const meetingTime = new Date(meeting.scheduledTime)
  const diff = meetingTime.getTime() - now.getTime()
  
  if (diff <= 0) return 'Meeting has started'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`
  return 'Starting now'
}

export const generateMeetingInvite = (meeting: Meeting, hostName: string): string => {
  const meetingTime = new Date(meeting.scheduledTime).toLocaleString()
  const meetingId = meeting.meetingId || meeting.roomId
  
  return `You're invited to join a meeting:

${meeting.title}
${meeting.description ? `\n${meeting.description}\n` : ''}
Time: ${meetingTime}
Duration: ${meeting.duration} minutes
Host: ${hostName}

Join the meeting:
Meeting ID: ${meetingId}
${meeting.requiresPassword ? `Password: ${meeting.password}` : ''}

Join URL: ${window.location.origin}?room=${meetingId}

This meeting ${meeting.waitingRoom ? 'has a waiting room enabled' : 'allows direct entry'}.
${meeting.allowRecording ? 'This meeting may be recorded.' : ''}`
}