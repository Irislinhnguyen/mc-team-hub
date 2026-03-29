#!/usr/bin/env node
/**
 * Quick script to refresh auth token for Playwright tests
 * Generates a valid JWT for the bible-admin user
 */

import crypto from 'crypto'
import { writeFileSync, readFileSync } from 'fs'

// Load env vars
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const JWT_SECRET = envVars.JWT_SECRET_KEY || envVars.JWT_SECRET || 'your-secret-key-change-in-production'

const user = {
  sub: '7f7b854e-6d05-41ea-a6ee-25e338d8f78d',
  email: 'bible-admin@geniee.co.jp',
  name: 'Bible Admin',
  role: 'admin',
  auth_type: 'password'
}

function generateAuthToken() {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (24 * 60 * 60) // 24 hours from now

  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    role: user.role,
    auth_type: user.auth_type,
    access_level: 'write',
    iat: now,
    exp: exp
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

async function generateCSRFToken() {
  const crypto = await import('crypto')
  return crypto.randomBytes(32).toString('hex')
}

async function main() {
  console.log('🔄 Generating fresh auth tokens...\n')
  console.log(`   Using JWT_SECRET: ${JWT_SECRET ? 'Set' : 'NOT SET'}`)

  const authToken = await generateAuthToken()
  const csrfToken = await generateCSRFToken()

  const authState = {
    cookies: [
      {
        name: 'csrf_token',
        value: csrfToken,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        httpOnly: true,
        secure: false,
        sameSite: 'Strict'
      },
      {
        name: 'auth_token',
        value: authToken,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        httpOnly: true,
        secure: false,
        sameSite: 'Strict'
      }
    ],
    origins: []
  }

  writeFileSync('tests/auth/auth.json', JSON.stringify(authState, null, 2))
  console.log('✅ Auth state saved to tests/auth/auth.json')
  console.log(`   User: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Expires: 24 hours from now\n`)
}

main().catch(console.error)
