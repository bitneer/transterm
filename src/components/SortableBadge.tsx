import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Database } from "@/types/supabase";

type Translation = Database["public"]["Tables"]["Translation"]["Row"];

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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Badge
        variant={translation.is_preferred ? "default" : "secondary"}
        className={`text-sm py-1 px-3 transition-all select-none ${
          isSessionActive
            ? "cursor-grab active:cursor-grabbing hover:scale-105"
            : "cursor-default"
        } ${
          translation.is_preferred
            ? "bg-green-600 hover:bg-green-700"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
        }`}
        onClick={onClick}
      >
        {translation.text}
        {translation.is_preferred && <Check className="w-3 h-3 ml-1" />}
      </Badge>
    </div>
  );
}
