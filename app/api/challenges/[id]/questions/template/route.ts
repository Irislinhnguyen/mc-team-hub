/**
 * Question Template Download API
 * Endpoint: GET (download CSV template)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CSV Template content
const CSV_TEMPLATE = `type,question,choices,items,zones,correct,points
essay,"Describe the key principles of machine learning and how they apply to real-world business problems.",,,,10
essay,"Explain the difference between supervised and unsupervised learning. Provide examples of each.",,,,,8
cloze,"In machine learning, {1} is the process of training a model on labeled data, while {2} works with unlabeled data to find hidden patterns.","supervised learning|unsupervised learning|reinforcement learning|deep learning",,,4
cloze,"The capital of {1} is Paris, and the capital of {2} is Tokyo.","France|Japan|Germany|Italy",,,3
drag_drop,"Match the programming languages to their primary use cases","Python|JavaScript|SQL|R","Data Science|Frontend Web|Database Queries|Statistical Analysis","Python->Data Science,JavaScript->Frontend Web,SQL->Database Queries,R->Statistical Analysis",6
drag_drop,"Match the machine learning terms to their definitions","Supervised Learning|Unsupervised Learning|Neural Network|Overfitting","Learning with labeled data|Finding patterns in unlabeled data|Algorithm inspired by human brain|Model memorizing training data","Supervised Learning->Learning with labeled data,Unsupervised Learning->Finding patterns in unlabeled data,Neural Network->Algorithm inspired by human brain,Overfitting->Model memorizing training data",8
`

// =====================================================
// GET - Download CSV template
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

    // Only Admin/Manager can download template
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Verify challenge exists
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, name')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Return CSV as downloadable file
    const filename = `${challenge.name.replace(/[^a-z0-9]/gi, '_')}_questions_template.csv`

    return new NextResponse(CSV_TEMPLATE, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[Template API] Error in GET:', error)

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
