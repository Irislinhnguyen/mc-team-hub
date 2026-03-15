import { authService } from './lib/services/auth'

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBnZW5pZWUuY28uanAiLCJyb2xlIjoiYWRtaW4iLCJhY2Nlc3NfbGV2ZWwiOiJ3cml0ZSIsImF1dGhfdHlwZSI6InBhc3N3b3JkIiwiZXhwIjoxNzczNTk2MTUwLCJpYXQiOjE3NzM1NjczNTAsImVtYWlsIjoiYWRtaW5AZ2VuaWVlLmNvLmpwIiwibmFtZSI6IlRlc3QgQWRtaW4ifQ.Pjkbdk8bf3VBmI78CdA6DHvdiUhqcO3rdMs0qmZoAjY"

try {
  const payload = authService.verifyToken(token)
  console.log('Token verified successfully:', payload)
} catch (error) {
  console.error('Token verification failed:', error)
}
