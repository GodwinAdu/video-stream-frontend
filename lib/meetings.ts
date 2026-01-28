const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export interface Meeting {
  _id?: string
  id?: string
  title: string
  description?: string
  scheduledTime: string
  duration: number
  timezone: string
  isRecurring: boolean
  recurringType?: string
  requiresPassword: boolean
  password?: string
  waitingRoom: boolean
  allowRecording: boolean
  status: 'scheduled' | 'active' | 'ended'
  participants: number
  roomId: string
  hostId?: string
  hostName?: string
}

export const getMeetings = async (): Promise<Meeting[]> => {
  const res = await fetch(`${API_URL}/api/meetings`, {
    credentials: 'include',
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch meetings')
  }
  
  const data = await res.json()
  return data.meetings
}

export const createMeeting = async (meeting: Omit<Meeting, '_id' | 'id' | 'hostId' | 'hostName'>): Promise<Meeting> => {
  const res = await fetch(`${API_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(meeting),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create meeting')
  }
  
  const data = await res.json()
  return data.meeting
}

export const updateMeeting = async (id: string, meeting: Partial<Meeting>): Promise<Meeting> => {
  const res = await fetch(`${API_URL}/api/meetings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(meeting),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update meeting')
  }
  
  const data = await res.json()
  return data.meeting
}

export const deleteMeeting = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/api/meetings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete meeting')
  }
}