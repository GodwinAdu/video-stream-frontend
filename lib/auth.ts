const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export interface User {
  id: string
  email: string
  name: string
  personalRoomId: string
  personalRoomPassword?: string
  profile: {
    avatar?: string
    title?: string
    company?: string
    timezone: string
  }
  meetingSettings: {
    waitingRoom: boolean
    muteOnEntry: boolean
    videoOnEntry: boolean
    allowScreenShare: boolean
    recordingEnabled: boolean
    chatEnabled: boolean
    maxParticipants: number
  }
  subscription: {
    plan: 'free' | 'pro' | 'business'
    meetingDuration: number
    cloudStorage: number
  }
  createdAt: string
}

export interface AuthResponse {
  user: User
}

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, name }),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Registration failed')
  }
  
  const data = await res.json()
  return { user: data.user }
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Login failed')
  }
  
  const data = await res.json()
  return { user: data.user }
}

export const getCurrentUser = async (): Promise<User> => {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: 'include',
  })
  
  if (!res.ok) {
    throw new Error('Failed to get user')
  }
  
  const data = await res.json()
  return data.user
}

export const saveAuth = (user: User) => {
  localStorage.setItem('auth_user', JSON.stringify(user))
}

export const getAuth = (): { user: User } | null => {
  const userStr = localStorage.getItem('auth_user')
  
  if (!userStr) return null
  
  try {
    const user = JSON.parse(userStr)
    return { user }
  } catch {
    return null
  }
}

export const logout = async () => {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  })
  localStorage.removeItem('auth_user')
}
