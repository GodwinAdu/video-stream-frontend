"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video, Mail, Lock, User, Loader2 } from "lucide-react"
import { login, register, saveAuth } from "@/lib/auth"

interface AuthModalProps {
  onSuccess: (userName: string) => void
  mode: "create" | "join"
}

export default function AuthModal({ onSuccess, mode }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [guestName, setGuestName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isGuest, setIsGuest] = useState(mode === "join")

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isGuest) {
        if (!guestName.trim()) {
          setError("Please enter your name")
          return
        }
        onSuccess(guestName.trim())
      } else {
        const result = isLogin
          ? await login(email, password)
          : await register(email, password, name)
        
        saveAuth(result.user)
        onSuccess(result.user.name)
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  if (mode === "join" && isGuest) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">Join Meeting</h2>
          <p className="text-gray-400 text-center mb-6">Enter your name to join as guest</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="guestName" className="text-gray-300">Your Name</Label>
              <Input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="John Doe"
                className="bg-gray-800 border-gray-700 text-white mt-1"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Join Meeting
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-400"
              onClick={() => setIsGuest(false)}
            >
              Sign in instead
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Video className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "create" ? "Create Meeting" : isLogin ? "Sign In" : "Sign Up"}
        </h2>
        <p className="text-gray-400 text-center mb-6">
          {mode === "create" 
            ? "Sign in to create and host meetings" 
            : isLogin ? "Welcome back!" : "Create your account"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name" className="text-gray-300">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-gray-800 border-gray-700 text-white pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-gray-800 border-gray-700 text-white pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-800 border-gray-700 text-white pl-10"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-gray-400"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>

          {mode === "join" && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-400"
              onClick={() => setIsGuest(true)}
            >
              Continue as guest
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
