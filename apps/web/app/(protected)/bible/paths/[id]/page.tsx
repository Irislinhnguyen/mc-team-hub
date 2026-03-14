'use client'

/**
 * MC Bible (Course Edition) - Path Detail Page
 * View articles in a learning path with navigation
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Path, PathArticle } from '@query-stream-ai/types/bible'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export default function PathDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pathId = params.id as string

  const [path, setPath] = useState<Path | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentArticleIndex, setCurrentArticleIndex] = useState<number | null>(null)
  const [togglingComplete, setTogglingComplete] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Fetch path details
        const response = await fetch(`/api/bible/paths/${pathId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Path not found')
          } else {
            throw new Error('Failed to fetch path details')
          }
          return
        }

        const data = await response.json()
        setPath(data.path)

        // Start with first article if available
        if (data.path.articles && data.path.articles.length > 0) {
          // Find first incomplete article, or start from beginning
          const firstIncompleteIndex = data.path.articles.findIndex(
            (pa: PathArticle) => !(pa.article as any)?.is_completed
          )
          setCurrentArticleIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0)
        }

        // For now, set canManage to true
        // In production, check user permissions
        setCanManage(true)
      } catch (err: any) {
        console.error('Error loading path:', err)
        setError(err.message || 'Failed to load path')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [pathId])

  const handleToggleComplete = async (articleId: string, isCompleted: boolean) => {
    try {
      setTogglingComplete(articleId)

      const method = isCompleted ? 'DELETE' : 'POST'
      const response = await fetch(`/api/bible/articles/${articleId}/progress`, {
        method,
      })

      if (!response.ok) {
        throw new Error('Failed to update progress')
      }

      // Reload path data to update progress
      const pathResponse = await fetch(`/api/bible/paths/${pathId}`)
      if (pathResponse.ok) {
        const data = await pathResponse.json()
        setPath(data.path)
      }
    } catch (err) {
      console.error('Error toggling completion:', err)
    } finally {
      setTogglingComplete(null)
    }
  }

  const handlePrevious = () => {
    if (currentArticleIndex !== null && currentArticleIndex > 0) {
      setCurrentArticleIndex(currentArticleIndex - 1)
    }
  }

  const handleNext = () => {
    if (path && currentArticleIndex !== null && currentArticleIndex < path.articles!.length - 1) {
      setCurrentArticleIndex(currentArticleIndex + 1)
    }
  }

  const currentArticle = path?.articles?.[currentArticleIndex ?? -1]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !path) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground mb-4">{error || 'Path not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const hasArticles = path.articles && path.articles.length > 0

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar - Article List */}
      <div className="w-full lg:w-80 border-r bg-muted/30 lg:min-h-[calc(100vh-4rem)]">
        {/* Path Header */}
        <div className="p-6 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
            onClick={() => router.push('/bible')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Paths
          </Button>

          {path.icon && <div className="text-4xl mb-2">{path.icon}</div>}
          <h1 className="text-2xl font-bold line-clamp-1">{path.title}</h1>
          {path.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {path.description}
            </p>
          )}

          {/* Progress */}
          {hasArticles && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Your Progress</span>
                <span className="font-medium">
                  {path.completed_count || 0} / {path.article_count}
                </span>
              </div>
              <Progress value={path.progress_percentage || 0} />
              <p className="text-xs text-muted-foreground mt-1">
                {path.progress_percentage}% complete
              </p>
            </div>
          )}
        </div>

        {/* Article List */}
        {hasArticles ? (
          <ScrollArea className="flex-1 h-[calc(100vh-20rem)]">
            <div className="p-4 space-y-1">
              {path.articles.map((pa, index) => {
                const isCompleted = (pa.article as any)?.is_completed
                const isActive = index === currentArticleIndex

                return (
                  <button
                    key={pa.id}
                    onClick={() => setCurrentArticleIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-green-500'}`} />
                        ) : (
                          <Circle className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-primary-foreground' : ''}`}>
                          {index + 1}. {pa.article?.title}
                        </p>
                        {pa.is_required && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No articles in this path yet
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentArticle ? (
          <>
            {/* Article Content */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto p-8">
                {/* Article Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline">
                      Article {currentArticleIndex! + 1} of {path.articles!.length}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/bible/manage?path=${pathId}`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    )}
                  </div>

                  <h2 className="text-3xl font-bold mb-2">
                    {currentArticle.article?.title}
                  </h2>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By {currentArticle.article?.creator_name || 'Unknown'}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>
                      {new Date(currentArticle.article!.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Mark Complete Button */}
                  <div className="mt-6">
                    <Button
                      variant={(currentArticle.article as any)?.is_completed ? 'outline' : 'default'}
                      onClick={() =>
                        handleToggleComplete(
                          currentArticle.article_id,
                          (currentArticle.article as any)?.is_completed
                        )
                      }
                      disabled={togglingComplete === currentArticle.article_id}
                    >
                      {togglingComplete === currentArticle.article_id ? (
                        'Updating...'
                      ) : (currentArticle.article as any)?.is_completed ? (
                        <>
                          <Circle className="h-4 w-4 mr-2" />
                          Mark Incomplete
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator className="mb-8" />

                {/* Article Body */}
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: currentArticle.article?.content || '',
                  }}
                />

                {/* Video/File Attachments */}
                {currentArticle.article?.video_url && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Video</h3>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={currentArticle.article.video_url}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {currentArticle.article?.file_url && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Attachments</h3>
                    <a
                      href={currentArticle.article.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{currentArticle.article.file_name}</p>
                        {currentArticle.article.file_size && (
                          <p className="text-sm text-muted-foreground">
                            {(currentArticle.article.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="border-t bg-muted/30 p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentArticleIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  {currentArticleIndex! + 1} / {path.articles!.length}
                </div>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentArticleIndex === path.articles!.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Articles</h3>
              <p className="text-muted-foreground mb-6">
                This path doesn't have any articles yet
              </p>
              {canManage && (
                <Button onClick={() => router.push(`/bible/manage?path=${pathId}`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Path
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
