import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
  const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS

  const report = {
    hasBase64: !!credentialsBase64,
    base64Length: credentialsBase64?.length || 0,
    hasFile: !!credentialsFile,
    fileValue: credentialsFile,
    base64Preview: credentialsBase64?.substring(0, 100) + '...',
  }

  // Test decoding
  if (credentialsBase64) {
    try {
      const decoded = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      report.decodeSuccess = true
      report.projectId = parsed.project_id
      report.clientEmail = parsed.client_email
      report.privateKeyStart = parsed.private_key?.substring(0, 50) + '...'
    } catch (error) {
      report.decodeSuccess = false
      report.decodeError = String(error)
      // Show first 200 chars of decoded to see what we got
      try {
        const decoded = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
        report.decodedPreview = decoded.substring(0, 200)
      } catch (e) {
        report.bufferError = String(e)
      }
    }
  }

  return NextResponse.json(report)
}
