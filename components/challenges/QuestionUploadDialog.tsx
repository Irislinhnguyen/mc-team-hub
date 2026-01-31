'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ParseError } from '@/lib/types/challenge';

interface QuestionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  onUploadSuccess: () => void;
}

export function QuestionUploadDialog({
  open,
  onOpenChange,
  challengeId,
  challengeName,
  onUploadSuccess,
}: QuestionUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [success, setSuccess] = useState(false);
  const [questionsAdded, setQuestionsAdded] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    setErrors([]);
    setSuccess(false);
    setQuestionsAdded(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', 'auto');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const res = await fetch(`/api/challenges/${challengeId}/questions/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        setError(data.error || 'Failed to upload file');
        return;
      }

      setSuccess(true);
      setQuestionsAdded(data.questions_added || 0);

      // Refresh question list after delay
      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/questions/template`);
      if (!res.ok) throw new Error('Failed to download template');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${challengeName.replace(/[^a-z0-9]/gi, '_')}_questions_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download template error:', err);
      setError('Failed to download template');
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      setErrors([]);
      setSuccess(false);
      setQuestionsAdded(0);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const getFileTypeIcon = () => {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" classNamePointerEvents="auto">
        <DialogHeader>
          <DialogTitle>Upload Questions</DialogTitle>
          <DialogDescription>
            Upload questions from a CSV or XML file for &quot;{challengeName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Drag and drop your CSV/XML file here
                </p>
                <p className="text-xs text-gray-500 mb-4">or click to browse</p>
                <Button type="button" variant="outline" size="sm">
                  Select File
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xml"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getFileTypeIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleFileSelect(null)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Validation errors:</p>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {errors.slice(0, 5).map((err, idx) => (
                    <li key={idx} className="text-xs">
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-xs">...and {errors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully imported {questionsAdded} question{questionsAdded !== 1 ? 's' : ''}!
              </AlertDescription>
            </Alert>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownloadTemplate}
              disabled={uploading}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open('https://github.com/your-repo/docs/question-format', '_blank')}
              disabled={uploading}
            >
              View Format Guide
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading || success}
            className="bg-[#1565C0] hover:bg-[#0D47A1]"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
