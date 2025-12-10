import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { Database } from '@/types/supabase';

type Translation = Database['public']['Tables']['Translation']['Row'];

interface SortableBadgeProps {
  translation: Translation;
  isSessionActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function SortableBadge({
  translation,
  isSessionActive,
  onClick,
}: SortableBadgeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: translation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isSessionActive ? listeners : {})}
    >
      <Badge
        variant={translation.is_preferred ? 'default' : 'secondary'}
        className={`px-3 py-1 text-sm transition-all select-none ${
          isSessionActive
            ? 'cursor-grab hover:scale-105 active:cursor-grabbing'
            : 'cursor-default'
        } ${
          translation.is_preferred
            ? 'border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
        }`}
        onClick={isSessionActive ? onClick : undefined}
      >
        {translation.text}
        {translation.is_preferred && <Check className="ml-1 h-3 w-3" />}
      </Badge>
    </div>
  );
}
