'use client'

import { useState, useEffect } from 'react'
import { FilterPanel } from '../../../components/performance-tracker/FilterPanel'
import FilterPanelSkeleton from '../../../components/performance-tracker/skeletons/FilterPanelSkeleton'
import { colors } from '../../../../lib/colors'

interface FilterConfig {
  name: string
  label: string
  type: 'daterange' | 'select'
  options?: Array<{ label: string; value: string }>
}

interface MetadataOptions {
  pics: Array<{ label: string; value: string }>
  products: Array<{ label: string; value: string }>
  pids: Array<{ label: string; value: string }>
  mids: Array<{ label: string; value: string }>
  pubnames: Array<{ label: string; value: string }>
  medianames: Array<{ label: string; value: string }>
  zids: Array<{ label: string; value: string }>
  zonenames: Array<{ label: string; value: string }>
}

export default function SalesTrackingPage() {
  const [loading, setLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const [metadata, setMetadata] = useState<MetadataOptions | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  // Load metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/performance-tracker/metadata')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch metadata`)
        }
        const result = await response.json()
        if (result.status === 'ok') {
          setMetadata(result.data)
          setMetadataError(null)
        } else {
          throw new Error(result.message || 'Unknown error fetching metadata')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load filters'
        console.error('Error fetching metadata:', errorMessage)
        setMetadataError(errorMessage)
        setMetadata(null)
      } finally {
        setMetadataLoading(false)
      }
    }

    fetchMetadata()
  }, [])

  const showMetadataError = metadataError && !metadataLoading

  const filterConfig: FilterConfig[] = [
    {
      name: 'daterange',
      label: 'Select date',
      type: 'daterange',
    },
    {
      name: 'pic',
      label: 'pic',
      type: 'select',
      options: metadata?.pics || [],
    },
    {
      name: 'product',
      label: 'product',
      type: 'select',
      options: metadata?.products || [],
    },
    {
      name: 'pid',
      label: 'pid',
      type: 'select',
      options: metadata?.pids || [],
    },
    {
      name: 'mid',
      label: 'mid',
      type: 'select',
      options: metadata?.mids || [],
    },
    {
      name: 'pubname',
      label: 'pubname',
      type: 'select',
      options: metadata?.pubnames || [],
    },
    {
      name: 'medianame',
      label: 'medianame',
      type: 'select',
      options: metadata?.medianames || [],
    },
    {
      name: 'zid',
      label: 'zid',
      type: 'select',
      options: metadata?.zids || [],
    },
    {
      name: 'zonename',
      label: 'zonename',
      type: 'select',
      options: metadata?.zonenames || [],
    },
  ]

  return (
    <div
      className="space-y-0"
      style={{
        backgroundColor: colors.neutralLight,
        minHeight: '100vh'
      }}
    >
      {/* Page Title */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: `2px solid ${colors.main}`,
          padding: '20px 24px'
        }}
      >
        <h1
          className="text-3xl font-bold"
          style={{ color: colors.main }}
        >
          Sales Performance
        </h1>
      </div>

      {/* Filter Panel */}
      {showMetadataError ? (
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900 mb-2">Failed to Load Filters</h3>
            <p className="text-red-700 text-sm mb-4">{metadataError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      ) : metadataLoading ? (
        <FilterPanelSkeleton filterCount={filterConfig.length} />
      ) : (
        <FilterPanel
          filters={filterConfig}
          onFilterChange={setCurrentFilters}
          isLoading={loading}
        />
      )}

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sales Tracking</h2>
          <p className="text-gray-600">This page will display sales tracking metrics including new sales and customer service breakdown.</p>
          <p className="text-gray-500 text-sm mt-4">Coming soon...</p>
        </div>
      </div>
    </div>
  )
}
