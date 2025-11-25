'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Feedback {
  id: string
  question: string
  sql?: string
  feedback_type: 'positive' | 'negative' | 'error'
  feedback_text?: string
  error_message?: string
  user_id?: string
  user_name: string
  user_email: string
  created_at: string
}

interface FeedbackResponse {
  feedbacks: Feedback[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type FilterType = 'all' | 'positive' | 'negative' | 'error'

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchFeedbacks = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filter !== 'all') {
        params.set('type', filter)
      }

      const response = await fetch(`/api/admin/feedback?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feedback')
      }

      const data: FeedbackResponse = await response.json()
      setFeedbacks(data.feedbacks)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [filter, page])

  const getTypeBadge = (type: Feedback['feedback_type']) => {
    switch (type) {
      case 'positive':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <ThumbsUp size={12} className="mr-1" />
            Positive
          </Badge>
        )
      case 'negative':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <ThumbsDown size={12} className="mr-1" />
            Negative
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <AlertCircle size={12} className="mr-1" />
            Error
          </Badge>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return ''
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  // Calculate stats
  const stats = {
    positive: feedbacks.filter(f => f.feedback_type === 'positive').length,
    negative: feedbacks.filter(f => f.feedback_type === 'negative').length,
    error: feedbacks.filter(f => f.feedback_type === 'error').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Feedback</h1>
        <p className="text-gray-600 mt-1">
          View feedback from users about AI-generated queries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-gray-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <p className="text-sm text-gray-600">Total Feedback</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700">{stats.positive}</div>
            <p className="text-sm text-green-600">Positive</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-700">{stats.negative}</div>
            <p className="text-sm text-red-600">Negative</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-700">{stats.error}</div>
            <p className="text-sm text-amber-600">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'positive', 'negative', 'error'] as FilterType[]).map((type) => (
                <Button
                  key={type}
                  variant={filter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFilter(type)
                    setPage(1)
                  }}
                  className={filter === type ? 'bg-[#1565C0] hover:bg-[#0D47A1]' : ''}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFeedbacks}
              disabled={loading}
            >
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search size={48} className="mb-4 text-gray-300" />
              <p>No feedback found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="max-w-[300px]">Question</TableHead>
                  <TableHead className="max-w-[200px]">Feedback</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map((feedback) => (
                  <TableRow
                    key={feedback.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                  >
                    <TableCell>{getTypeBadge(feedback.feedback_type)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{feedback.user_name}</span>
                        <span className="text-xs text-gray-500">{feedback.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-sm text-gray-700">
                        {expandedId === feedback.id
                          ? feedback.question
                          : truncateText(feedback.question, 80)}
                      </div>
                      {expandedId === feedback.id && feedback.sql && (
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {feedback.sql}
                        </pre>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="text-sm">
                        {feedback.feedback_type === 'error' ? (
                          <span className="text-amber-700">
                            {expandedId === feedback.id
                              ? feedback.error_message
                              : truncateText(feedback.error_message || '', 50)}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {expandedId === feedback.id
                              ? feedback.feedback_text || '-'
                              : truncateText(feedback.feedback_text || '-', 50)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(feedback.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
