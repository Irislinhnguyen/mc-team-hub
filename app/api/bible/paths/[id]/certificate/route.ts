/**
 * Certificate Generation API
 * Generates PDF certificates for completed learning paths
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCertificate, formatDateForCertificate } from '@/lib/certificate/template'

// =====================================================
// POST - Generate certificate
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const pathId = params.id

    // Fetch path details
    const { data: path, error: pathError } = await supabase
      .from('bible_paths')
      .select('*')
      .eq('id', pathId)
      .single()

    if (pathError || !path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Check if user has completed this path
    const { data: pathArticles } = await supabase
      .from('bible_path_articles')
      .select('article_id')
      .eq('path_id', pathId)

    if (!pathArticles || pathArticles.length === 0) {
      return NextResponse.json({ error: 'No articles in this path' }, { status: 400 })
    }

    const articleIds = pathArticles.map((pa: any) => pa.article_id)

    // Fetch user progress for this path
    const { data: userProgress } = await supabase
      .from('bible_user_progress')
      .select('article_id')
      .eq('user_id', user.sub)
      .in('article_id', articleIds)

    const completedCount = userProgress?.length || 0
    const totalCount = articleIds.length

    // Check if path is 100% complete
    if (completedCount < totalCount) {
      return NextResponse.json({
        error: 'Path not completed',
        completed: completedCount,
        total: totalCount,
      }, { status: 400 })
    }

    // Get user name
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.sub)
      .single()

    const userName = userData?.name || 'User'

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('bible_certificates')
      .select('*')
      .eq('user_id', user.sub)
      .eq('path_id', pathId)
      .single()

    if (existingCert) {
      // Update download count
      await supabase
        .from('bible_certificates')
        .update({
          downloaded_at: new Date().toISOString(),
          download_count: (existingCert.download_count || 0) + 1,
        })
        .eq('id', existingCert.id)
    } else {
      // Create certificate record
      await supabase
        .from('bible_certificates')
        .insert({
          user_id: user.sub,
          path_id: pathId,
          generated_at: new Date().toISOString(),
        })
    }

    // Generate certificate PDF
    const certificateData = {
      userName,
      pathTitle: path.title,
      pathDescription: path.description,
      completionDate: formatDateForCertificate(new Date()),
      pathIcon: path.icon,
      pathColor: path.color,
    }

    const pdfBlob = await generateCertificate(certificateData)

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate-${path.title.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[Certificate API] Error generating certificate:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET - Check certificate eligibility
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const pathId = params.id

    // Check if certificate exists
    const { data: certificate } = await supabase
      .from('bible_certificates')
      .select('*')
      .eq('user_id', user.sub)
      .eq('path_id', pathId)
      .single()

    if (!certificate) {
      // Check if path is completed
      const { data: pathArticles } = await supabase
        .from('bible_path_articles')
        .select('article_id')
        .eq('path_id', pathId)

      const articleIds = pathArticles?.map((pa: any) => pa.article_id) || []

      const { data: userProgress } = await supabase
        .from('bible_user_progress')
        .select('article_id')
        .eq('user_id', user.sub)
        .in('article_id', articleIds)

      const completedCount = userProgress?.length || 0
      const totalCount = articleIds.length

      return NextResponse.json({
        hasCertificate: false,
        isEligible: completedCount === totalCount && totalCount > 0,
        completed: completedCount,
        total: totalCount,
      })
    }

    return NextResponse.json({
      hasCertificate: true,
      certificate: {
        generated_at: certificate.generated_at,
        downloaded_at: certificate.downloaded_at,
        download_count: certificate.download_count,
      },
    })
  } catch (error) {
    console.error('[Certificate API] Error checking certificate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
