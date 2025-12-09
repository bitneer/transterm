'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SortableTagProps {
  id: string;
  text: string;
  isPreferred?: boolean;
  onRemove: () => void;
}

export function SortableTag({
  id,
  text,
  isPreferred = false,
  onRemove,
}: SortableTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'inline-flex cursor-move select-none',
        isDragging && 'opacity-50',
      )}
    >
      <Badge
        variant="secondary"
        className={cn(
          'flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition-colors',
          isPreferred
            ? 'border-green-200 bg-green-100 text-green-800 hover:bg-green-200 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
        )}
      >
        {isPreferred && <Check className="h-3.5 w-3.5" />}
        <span className="mb-0.5">{text}</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'ml-1 rounded-full p-0.5 transition-colors',
            isPreferred
              ? 'hover:bg-green-300/50 dark:hover:bg-green-800/50'
              : 'hover:bg-slate-300/50 dark:hover:bg-slate-700/50',
          )}
        >
          <X
            className={cn(
              'h-3.5 w-3.5',
              !isPreferred && 'text-muted-foreground',
            )}
          />
        </button>
      </Badge>
    </div>
  );
}
