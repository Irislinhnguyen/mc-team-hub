'use client'

/**
 * MC Bible (Course Edition) - Management Page
 * Admin/Manager/Leader can create and manage paths and articles
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Path, Article } from '@/lib/types/bible'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  BookOpen,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { ArticleEditor } from '@/components/bible/ArticleEditor'
import { QuizEditor } from '@/components/bible/QuizEditor'
import { useToast } from '@/hooks/use-toast'
import type { QuizQuestion } from '@/lib/types/bible'
import { bible } from '@/lib/design-tokens'

// Sortable Article Component
interface SortableArticleProps {
  pa: any
  onEdit: (article: Article) => void
  onRemove: (id: string) => void
}

function SortableArticle({ pa, onEdit, onRemove }: SortableArticleProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: pa.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center ${bible.spacing.listGap} ${bible.spacing.cardPaddingCompact} rounded-lg border bg-card`}>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab"
      >
        <GripVertical className={`${bible.iconSizes.md} text-muted-foreground`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{pa.article?.title}</p>
        <div className={`flex items-center ${bible.spacing.buttonGap} mt-1`}>
          <Badge variant="secondary" className={bible.typography.badgeText}>
            {pa.article?.content_type}
          </Badge>
          {pa.is_required && (
            <Badge variant="outline" className={bible.typography.badgeText}>
              Required
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(pa.article as Article)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(pa.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function BibleManagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPathId = searchParams.get('path')
  const { toast } = useToast()

  const [paths, setPaths] = useState<Path[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Path editing state
  const [selectedPath, setSelectedPath] = useState<Path | null>(null)
  const [showPathDialog, setShowPathDialog] = useState(false)
  const [pathForm, setPathForm] = useState({
    title: '',
    description: '',
    icon: '',
    color: '#3b82f6',
    sections: [] as string[],
  })

  // Article editing state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showArticleDialog, setShowArticleDialog] = useState(false)
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    content_type: 'article' as const,
    video_url: '',
    slide_deck_url: '',
    quiz_data: [] as QuizQuestion[],
    tags: [] as string[],
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'path' | 'article'; id: string } | null>(null)

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false)

  // Drag-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
  )

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !selectedPath) return

    const oldIndex = selectedPath.articles?.findIndex((pa) => pa.id === active.id)
    const newIndex = selectedPath.articles?.findIndex((pa) => pa.id === over.id)

    if (oldIndex === undefined || newIndex === undefined) return

    // Reorder locally
    const newPathArticles = arrayMove(selectedPath.articles, oldIndex, newIndex)
    setSelectedPath({ ...selectedPath, articles: newPathArticles })

    // Save to server
    try {
      const response = await fetch(`/api/bible/paths/${selectedPath.id}/articles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: newPathArticles.map((pa, index) => ({
            id: pa.id,
            article_id: pa.article_id,
            display_order: index,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder articles')
      }

      await loadData()
    } catch (error) {
      console.error('Error reordering articles:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reorder articles. Please try again.',
      })
      // Revert on error
      setSelectedPath(selectedPath)
    }
  }

  useEffect(() => {
    async function init() {
      // Load data - API will handle authorization
      loadData()
    }

    init()
  }, [router])

  useEffect(() => {
    if (initialPathId && paths.length > 0) {
      const path = paths.find(p => p.id === initialPathId)
      if (path) {
        setSelectedPath(path)
      }
    }
  }, [initialPathId, paths])

  async function loadData() {
    try {
      setLoading(true)

      const [pathsRes, articlesRes] = await Promise.all([
        fetch('/api/bible/paths'),
        fetch('/api/bible/articles'),
      ])

      if (pathsRes.ok) {
        const pathsData = await pathsRes.json()
        setPaths(pathsData.paths || [])
      }

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json()
        setArticles(articlesData.articles || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function savePath() {
    if (!pathForm.title.trim()) return

    setSaving(true)
    try {
      const method = selectedPath ? 'PUT' : 'POST'
      const url = selectedPath
        ? `/api/bible/paths/${selectedPath.id}`
        : '/api/bible/paths'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pathForm),
      })

      if (!response.ok) throw new Error('Failed to save path')

      setShowPathDialog(false)
      resetPathForm()
      await loadData()
    } catch (error) {
      console.error('Error saving path:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save path. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deletePath(id: string) {
    setSaving(true)
    try {
      const response = await fetch(`/api/bible/paths/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete path')

      if (selectedPath?.id === id) setSelectedPath(null)
      setDeleteConfirm(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting path:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete path. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function saveArticle() {
    if (!articleForm.title.trim() || !articleForm.content.trim()) return

    setSaving(true)
    try {
      const method = selectedArticle ? 'PUT' : 'POST'
      const url = selectedArticle
        ? `/api/bible/articles/${selectedArticle.id}`
        : '/api/bible/articles'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleForm),
      })

      if (!response.ok) throw new Error('Failed to save article')

      setShowArticleDialog(false)
      resetArticleForm()
      await loadData()
    } catch (error) {
      console.error('Error saving article:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save article. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle(id: string) {
    setSaving(true)
    try {
      const response = await fetch(`/api/bible/articles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete article')

      if (selectedArticle?.id === id) setSelectedArticle(null)
      setDeleteConfirm(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting article:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete article. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function addArticleToPath(articleId: string) {
    if (!selectedPath) return

    setSaving(true)
    try {
      const response = await fetch(`/api/bible/paths/${selectedPath.id}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      })

      if (!response.ok) throw new Error('Failed to add article')

      await loadData()
    } catch (error) {
      console.error('Error adding article:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add article to path. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function removeArticleFromPath(pathArticleId: string) {
    if (!selectedPath) return

    setSaving(true)
    try {
      const pa = selectedPath.articles?.find(a => a.id === pathArticleId)
      if (!pa) return

      const response = await fetch(
        `/api/bible/paths/${selectedPath.id}/articles?article_id=${pa.article_id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to remove article')

      await loadData()
    } catch (error) {
      console.error('Error removing article:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove article from path. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File): Promise<string> => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/bible/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      return data.file_url
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploadingFile(false)
    }
  }

  function openPathDialog(path?: Path) {
    if (path) {
      setSelectedPath(path)
      setPathForm({
        title: path.title,
        description: path.description || '',
        icon: path.icon || '',
        color: path.color || '#3b82f6',
        sections: path.sections || [],
      })
    } else {
      setSelectedPath(null)
      resetPathForm()
    }
    setShowPathDialog(true)
  }

  function resetPathForm() {
    setPathForm({
      title: '',
      description: '',
      icon: '',
      color: '#3b82f6',
    })
  }

  function openArticleDialog(article?: Article) {
    if (article) {
      setSelectedArticle(article)
      setArticleForm({
        title: article.title,
        content: article.content,
        content_type: article.content_type,
        video_url: article.video_url || '',
        slide_deck_url: article.slide_deck_url || '',
        quiz_data: article.quiz_data || [],
        tags: article.tags || [],
      })
    } else {
      setSelectedArticle(null)
      resetArticleForm()
    }
    setShowArticleDialog(true)
  }

  function resetArticleForm() {
    setArticleForm({
      title: '',
      content: '',
      content_type: 'article',
      video_url: '',
      slide_deck_url: '',
      quiz_data: [],
      tags: [],
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/bible')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bible
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Content</h1>
            <p className="text-muted-foreground">Create and edit learning paths and articles</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paths List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Learning Paths</CardTitle>
              <Button size="sm" onClick={() => openPathDialog()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Select a path to manage its articles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paths.map((path) => (
                <div
                  key={path.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPath?.id === path.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedPath(path)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {path.icon && <span className="text-xl">{path.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{path.title}</p>
                        <p className="text-xs opacity-70">
                          {path.article_count || 0} articles
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPathDialog(path)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm({ type: 'path', id: path.id })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Path Detail / Articles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            {selectedPath ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    {selectedPath.icon && <div className="text-3xl mb-1">{selectedPath.icon}</div>}
                    <CardTitle>{selectedPath.title}</CardTitle>
                    {selectedPath.description && (
                      <CardDescription className="mt-1">
                        {selectedPath.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <CardTitle>Select a Path</CardTitle>
                <CardDescription>Choose a learning path from the list to manage its articles</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {selectedPath ? (
              <Tabs defaultValue="articles">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="articles">Articles in Path</TabsTrigger>
                  <TabsTrigger value="all">All Articles</TabsTrigger>
                </TabsList>

                {/* Articles in this path */}
                <TabsContent value="articles" className="space-y-2">
                  {selectedPath.articles && selectedPath.articles.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedPath.articles.map(pa => pa.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedPath.articles.map((pa) => (
                          <SortableArticle
                            key={pa.id}
                            pa={pa}
                            onEdit={() => openArticleDialog(pa.article as Article)}
                            onRemove={() => removeArticleFromPath(pa.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No articles in this path yet
                    </div>
                  )}
                </TabsContent>

                {/* All articles - add to path */}
                <TabsContent value="all" className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Click + to add article to this path
                    </p>
                    <Button size="sm" onClick={() => openArticleDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Article
                    </Button>
                  </div>
                  {articles.map((article) => {
                    const isInPath = selectedPath.articles?.some(
                      pa => pa.article_id === article.id
                    )

                    return (
                      <div
                        key={article.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{article.title}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {article.content_type}
                          </Badge>
                        </div>
                        {isInPath ? (
                          <Badge variant="outline" className="text-xs">
                            Added
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addArticleToPath(article.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openArticleDialog(article)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a path to start managing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Path Dialog */}
      <Dialog open={showPathDialog} onOpenChange={setShowPathDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPath ? 'Edit Path' : 'Create New Path'}</DialogTitle>
            <DialogDescription>
              {selectedPath ? 'Update path details' : 'Create a new learning path'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="path-title">Title *</Label>
              <Input
                id="path-title"
                value={pathForm.title}
                onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                placeholder="e.g., Sales Onboarding"
              />
            </div>
            <div>
              <Label htmlFor="path-desc">Description</Label>
              <Textarea
                id="path-desc"
                value={pathForm.description}
                onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                placeholder="Brief description of this path..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="path-icon">Icon (emoji)</Label>
                <Input
                  id="path-icon"
                  value={pathForm.icon}
                  onChange={(e) => setPathForm({ ...pathForm, icon: e.target.value })}
                  placeholder="📚"
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="path-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="path-color"
                    type="color"
                    value={pathForm.color}
                    onChange={(e) => setPathForm({ ...pathForm, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={pathForm.color}
                    onChange={(e) => setPathForm({ ...pathForm, color: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="path-sections">Sections</Label>
              <Input
                id="path-sections"
                value={pathForm.sections.join(', ')}
                onChange={(e) => setPathForm({
                  ...pathForm,
                  sections: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                placeholder="e.g., Basics, Advanced, Reference"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated section names for organizing articles
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPathDialog(false)}>
              Cancel
            </Button>
            <Button onClick={savePath} disabled={saving || !pathForm.title.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
            <DialogDescription>
              {selectedArticle ? 'Update article content' : 'Create a new article with rich text'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="article-title">Title *</Label>
              <Input
                id="article-title"
                value={articleForm.title}
                onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                placeholder="e.g., Welcome to the Team"
              />
            </div>
            <div>
              <Label htmlFor="article-type">Content Type</Label>
              <select
                id="article-type"
                value={articleForm.content_type}
                onChange={(e) =>
                  setArticleForm({ ...articleForm, content_type: e.target.value as any })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="article">Article</option>
                <option value="howto">How-To Guide</option>
                <option value="video">Video</option>
                <option value="file">File Attachment</option>
                <option value="slides">Slide Deck</option>
              </select>
            </div>
            <div>
              <Label htmlFor="article-tags">Tags</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {articleForm.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          const newTags = articleForm.tags.filter((_, i) => i !== index)
                          setArticleForm({ ...articleForm, tags: newTags })
                        }}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="article-tags"
                  type="text"
                  placeholder="Add a tag and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const input = e.target as HTMLInputElement
                      const newTag = input.value.trim()
                      if (newTag && !articleForm.tags.includes(newTag)) {
                        setArticleForm({ ...articleForm, tags: [...articleForm.tags, newTag] })
                        input.value = ''
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Press Enter to add a tag. Click X to remove.
                </p>
              </div>
            </div>
            <div>
              <Label>Content *</Label>
              <ArticleEditor
                value={articleForm.content}
                onChange={(content) => setArticleForm({ ...articleForm, content })}
                onImageUpload={handleImageUpload}
              />
            </div>

            {/* Quiz Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <QuizEditor
                initialQuestions={articleForm.quiz_data}
                onChange={(quizData) => setArticleForm({ ...articleForm, quiz_data: quizData })}
              />
            </div>
            {articleForm.content_type === 'video' && (
              <div>
                <Label htmlFor="article-video">Video URL</Label>
                <Input
                  id="article-video"
                  value={articleForm.video_url}
                  onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube, Vimeo, and Loom URLs are supported
                </p>
              </div>
            )}
            {articleForm.content_type === 'slides' && (
              <div>
                <Label htmlFor="article-slides">Slide Deck URL</Label>
                <Input
                  id="article-slides"
                  value={articleForm.slide_deck_url}
                  onChange={(e) => setArticleForm({ ...articleForm, slide_deck_url: e.target.value })}
                  placeholder="https://docs.google.com/presentation/d/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Google Slides and PowerPoint Online URLs are supported
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArticleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveArticle}
              disabled={saving || !articleForm.title.trim() || !articleForm.content.trim()}
            >
              {saving ? 'Saving...' : 'Save Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm?.type === 'path' ? 'Path' : 'Article'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'path'
                ? 'This will delete the path and remove all article associations. Articles will not be deleted.'
                : 'This will permanently delete this article and remove it from all paths.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() =>
                deleteConfirm?.type === 'path'
                  ? deletePath(deleteConfirm.id)
                  : deleteArticle(deleteConfirm.id)
              }
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
