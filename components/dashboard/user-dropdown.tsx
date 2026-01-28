"use client"

import { useState } from "react"
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Key,
  Edit,
  Activity,
  CreditCard,
  HelpCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { logout } from "@/lib/auth"

interface UserDropdownProps {
  user: any
  onLogout: () => void
  onProfileUpdate: () => void
  onChangePassword: () => void
  onSettings: () => void
}

export default function UserDropdown({ 
  user, 
  onLogout, 
  onProfileUpdate, 
  onChangePassword,
  onSettings 
}: UserDropdownProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const handleLogout = async () => {
    await logout()
    onLogout()
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 bg-gray-900/95 backdrop-blur-xl border-gray-700/50 text-gray-50" align="end" forceMount>
        {/* User Info Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{user?.name}</p>
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 text-xs">
                  {user?.subscription?.plan || 'Free'} Plan
                </Badge>
                {user?.profile?.title && (
                  <span className="text-xs text-gray-500">{user.profile.title}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wider">
            Account
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={onProfileUpdate}
            className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50"
          >
            <Edit className="mr-3 h-4 w-4 text-blue-400" />
            <div className="flex-1">
              <div className="font-medium">Edit Profile</div>
              <div className="text-xs text-gray-500">Update your personal information</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={onChangePassword}
            className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50"
          >
            <Key className="mr-3 h-4 w-4 text-green-400" />
            <div className="flex-1">
              <div className="font-medium">Change Password</div>
              <div className="text-xs text-gray-500">Update your account security</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50">
            <Shield className="mr-3 h-4 w-4 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium">Privacy & Security</div>
              <div className="text-xs text-gray-500">Manage your privacy settings</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700/50" />

        {/* Activity & Preferences */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wider">
            Activity
          </DropdownMenuLabel>

          <DropdownMenuItem className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50">
            <Activity className="mr-3 h-4 w-4 text-orange-400" />
            <div className="flex-1">
              <div className="font-medium">Meeting History</div>
              <div className="text-xs text-gray-500">View your past meetings</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50">
            <Bell className="mr-3 h-4 w-4 text-yellow-400" />
            <div className="flex-1">
              <div className="font-medium">Notifications</div>
              <div className="text-xs text-gray-500">Manage notification preferences</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={toggleTheme}
            className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50"
          >
            {theme === 'dark' ? (
              <Sun className="mr-3 h-4 w-4 text-yellow-400" />
            ) : (
              <Moon className="mr-3 h-4 w-4 text-blue-400" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </div>
              <div className="text-xs text-gray-500">Switch appearance theme</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700/50" />

        {/* Subscription & Support */}
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50">
            <CreditCard className="mr-3 h-4 w-4 text-green-400" />
            <div className="flex-1">
              <div className="font-medium">Upgrade Plan</div>
              <div className="text-xs text-gray-500">Get more features with Pro</div>
            </div>
            <Badge variant="secondary" className="bg-green-600/20 text-green-300 text-xs">
              Pro
            </Badge>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={onSettings}
            className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50"
          >
            <Settings className="mr-3 h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium">Settings</div>
              <div className="text-xs text-gray-500">Configure your preferences</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer hover:bg-gray-800/50 focus:bg-gray-800/50">
            <HelpCircle className="mr-3 h-4 w-4 text-blue-400" />
            <div className="flex-1">
              <div className="font-medium">Help & Support</div>
              <div className="text-xs text-gray-500">Get help and contact support</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700/50" />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer hover:bg-red-600/20 focus:bg-red-600/20 text-red-400"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">Sign Out</div>
            <div className="text-xs text-red-500/70">Sign out of your account</div>
          </div>
        </DropdownMenuItem>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700/50">
          <div className="text-xs text-gray-500 text-center">
            VideoStream Pro v2.0
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}