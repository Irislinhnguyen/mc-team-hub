'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  email: string
  name?: string
  role: string
}

export function AdminLink() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return null
  }

  // Only show for leader+ users
  if (!user || (user.role !== 'leader' && user.role !== 'manager' && user.role !== 'admin')) {
    return null
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://geniee-admin.vercel.app'}/api/auth/verify`

  return (
    <Link
      href={adminUrl}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Admin Dashboard
    </Link>
  )
}
