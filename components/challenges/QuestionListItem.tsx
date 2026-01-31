'use client';

import { Pencil, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ChallengeQuestion } from '@/lib/types/challenge';

interface QuestionListItemProps {
  question: ChallengeQuestion;
  index: number;
  totalQuestions: number;
  onEdit: (question: ChallengeQuestion) => void;
  onDelete: (question: ChallengeQuestion) => void;
  onMoveUp: (question: ChallengeQuestion) => void;
  onMoveDown: (question: ChallengeQuestion) => void;
  readOnly?: boolean;
}

export function QuestionListItem({
  question,
  index,
  totalQuestions,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  readOnly = false,
}: QuestionListItemProps) {
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'essay':
        return 'Essay';
      case 'cloze':
        return 'Fill in the Blanks';
      case 'drag_drop':
        return 'Drag & Drop';
      default:
        return type;
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'essay':
        return '📝';
      case 'cloze':
        return '✏️';
      case 'drag_drop':
        return '🎯';
      default:
        return '❓';
    }
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'essay':
        return 'bg-blue-100 text-blue-700';
      case 'cloze':
        return 'bg-purple-100 text-purple-700';
      case 'drag_drop':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < totalQuestions - 1;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <span className="cursor-grab text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <span className="font-medium text-gray-900">#{index + 1}</span>
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <Badge className={getQuestionTypeColor(question.question_type)}>
          <span className="mr-1">{getQuestionTypeIcon(question.question_type)}</span>
          {getQuestionTypeLabel(question.question_type)}
        </Badge>
      </td>

      <td className="px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm text-gray-900 cursor-help max-w-md">
                {truncateText(question.question_text)}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-md p-3"
              sideOffset={5}
            >
              <div className="text-sm whitespace-pre-wrap">
                {question.question_text}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {question.points}
          </span>
          <span className="text-xs text-gray-500">
            pt{question.points !== 1 ? 's' : ''}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {!readOnly ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveUp(question)}
              disabled={!canMoveUp}
              className="h-8 w-8 p-0"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveDown(question)}
              disabled={!canMoveDown}
              className="h-8 w-8 p-0"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(question)}
              className="h-8 w-8 p-0"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-500 italic">Read-only</span>
        )}
      </td>
    </tr>
  );
}
