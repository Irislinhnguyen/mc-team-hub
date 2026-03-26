'use client'

/**
 * Certificate - Display and download completion certificates
 */

import { useState, useEffect } from 'react'
import { Award, Download, Share2, Printer, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { bible } from '@/lib/design-tokens'

interface CertificateProps {
  pathId: string
  pathTitle: string
  isCompleted: boolean
  onComplete?: () => void
}

export function Certificate({ pathId, pathTitle, isCompleted, onComplete }: CertificateProps) {
  const { toast } = useToast()
  const [hasCertificate, setHasCertificate] = useState(false)
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    async function checkCertificate() {
      try {
        const response = await fetch(`/api/bible/paths/${pathId}/certificate`)
        if (response.ok) {
          const data = await response.json()
          setHasCertificate(data.hasCertificate)
          setIsEligible(data.isEligible)

          // Show confetti on first view if just completed
          if (data.hasCertificate && !showConfetti) {
            setShowConfetti(true)
          }
        }
      } catch (error) {
        console.error('Error checking certificate:', error)
      }
    }

    checkCertificate()
  }, [pathId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/bible/paths/${pathId}/certificate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download certificate')
      }

      // Get PDF blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Certificate-${pathTitle.replace(/[^a-z0-9]/gi, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Certificate downloaded!',
        description: 'Your certificate has been downloaded successfully.',
      })
    } catch (error) {
      console.error('Error downloading certificate:', error)
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download certificate',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/bible/paths/${pathId}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `I completed ${pathTitle}!`,
          text: `Check out my certificate for completing the ${pathTitle} learning path.`,
          url: shareUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: 'Link copied!',
        description: 'Share URL copied to clipboard',
      })
    }
  }

  const handlePrint = () => {
    toast({
      title: 'Printing',
      description: 'Download your certificate to print it',
    })
  }

  // Don't show anything if not completed and not eligible
  if (!isCompleted && !isEligible) {
    return null
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${bible.spacing.buttonGap}`}>
            {showConfetti && <CheckCircle2 className={`${bible.iconSizes.md} text-green-500`} />}
            <Award className={`${bible.iconSizes.md} text-primary`} />
            <CardTitle>Certificate</CardTitle>
          </div>
          {hasCertificate && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Earned
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasCertificate
            ? 'Congratulations! You earned your certificate.'
            : isEligible
            ? 'You completed this path! Generate your certificate below.'
            : 'Complete all articles to earn your certificate.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`flex flex-wrap ${bible.spacing.buttonGap}`}>
          <Button
            onClick={handleDownload}
            disabled={downloading || !isEligible}
            className="flex-1"
          >
            <Download className={`${bible.iconSizes.sm} mr-2`} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button
            onClick={handleShare}
            disabled={!hasCertificate}
            variant="outline"
          >
            <Share2 className={`${bible.iconSizes.sm} mr-2`} />
            Share
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!hasCertificate}
            variant="outline"
          >
            <Printer className={`${bible.iconSizes.sm} mr-2`} />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
