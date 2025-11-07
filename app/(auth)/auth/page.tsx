'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)
      window.location.href = '/api/auth/login'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Get return URL from cookie (will be read by client)
      // Wait a moment for cookie to be set, then redirect to returnUrl or home
      await new Promise(resolve => setTimeout(resolve, 100))

      // Try to get return URL from cookie (best effort - client can't read httpOnly)
      // Actually, return_url cookie is httpOnly, so we'll just redirect to home
      // The server-side redirect already handled the return URL for OAuth
      // For password login, we need to check if there's a query param
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get('returnUrl') || '/'
      window.location.href = returnUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Performance Tracker AI</CardTitle>
        <CardDescription>
          Sign in to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              For @geniee.co.jp accounts only
            </p>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@geniee.co.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Admin accounts only
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </CardContent>
    </Card>
  )
}
