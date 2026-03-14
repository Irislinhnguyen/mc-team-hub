/**
 * Bible File Upload API
 * Endpoint: POST (upload file to Supabase Storage)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import { z } from 'zod'

// =====================================================
// Constants
// =====================================================

const BIBLE_STORAGE_BUCKET = 'bible-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
]

// =====================================================
// POST - Upload file
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader/Manager/Admin can upload files
    requireLeaderOrAbove(user)

    const supabase = createAdminClient()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({
        error: 'Validation failed',
        details: { file: ['No file provided'] },
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'Validation failed',
        details: { file: [`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`] },
      }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Validation failed',
        details: { file: ['File type not allowed'] },
      }, { status: 400 })
    }

    // Check if bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === BIBLE_STORAGE_BUCKET)

    if (!bucketExists) {
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket(BIBLE_STORAGE_BUCKET, {
        public: true, // Allow public access for files
        fileSizeLimit: MAX_FILE_SIZE.toString(),
        allowedMimeTypes: ALLOWED_FILE_TYPES,
      })

      if (createError) {
        console.error('[Bible Upload API] Error creating bucket:', createError)
        return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 })
      }

      // Set up public access policy for the bucket
      await supabase.storage.from(BIBLE_STORAGE_BUCKET).createSignedUrl('setup', 60) // Initialize bucket
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop() || ''
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BIBLE_STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Bible Upload API] Error uploading file:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BIBLE_STORAGE_BUCKET)
      .getPublicUrl(fileName)

    return NextResponse.json({
      status: 'ok',
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    })
  } catch (error: any) {
    console.error('[Bible Upload API] Error in POST:', error)

    // Handle permission errors
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
