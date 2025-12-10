'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableBadge } from '@/components/SortableBadge';
import MarkdownViewer from '@/components/MarkdownViewer';
import { TermWithTranslations } from '@/types';
import { Session } from '@supabase/supabase-js';

interface TermCardProps {
  initialTerm: TermWithTranslations;
  session: Session | null;
}

export function TermCard({
  initialTerm,
  session,
  onDelete,
}: TermCardProps & { onDelete?: (id: number) => void }) {
  const [term, setTerm] = useState(initialTerm);
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = createClient();

  const handleTranslationClick = async (
    termId: number,
    translationId: number,
    currentPreferred: boolean,
  ) => {
    if (!session) return;
    if (currentPreferred) return;

    const clickedIndex = term.Translation.findIndex(
      (t) => t.id === translationId,
    );
    if (clickedIndex === -1) return;

    // Move to front
    const newTranslations = arrayMove(term.Translation, clickedIndex, 0).map(
      (t, index) => ({
        ...t,
        sort_order: index,
        is_preferred: index === 0,
      }),
    );

    // Optimistic Update
    setTerm((prev) => ({ ...prev, Translation: newTranslations }));

    try {
      const updates = newTranslations.map((t) =>
        supabase
          .from('Translation')
          .update({ sort_order: t.sort_order, is_preferred: t.is_preferred })
          .eq('id', t.id),
      );

      const updateResults = await Promise.all(updates);
      const isError = updateResults.some((r) => r.error);
      if (isError) throw new Error('Some updates failed');

      toast.success('선호 대역어로 설정되었습니다.');
    } catch (error) {
      console.error('Error updating translation preference:', error);
      toast.error('변경 사항을 저장하지 못했습니다.');
      setTerm(initialTerm); // Rollback
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!session) return;
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = term.Translation.findIndex((t) => t.id === active.id);
    const newIndex = term.Translation.findIndex((t) => t.id === over.id);

    // Optimistic Update
    const newTranslations = arrayMove(term.Translation, oldIndex, newIndex).map(
      (t, index) => ({
        ...t,
        sort_order: index,
        is_preferred: index === 0, // First item is always preferred
      }),
    );

    setTerm((prev) => ({ ...prev, Translation: newTranslations }));

    // Backend Update
    try {
      const updates = newTranslations.map((t) =>
        supabase
          .from('Translation')
          .update({ sort_order: t.sort_order, is_preferred: t.is_preferred })
          .eq('id', t.id),
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast.error('순서 저장에 실패했습니다.');
      setTerm(initialTerm); // Rollback
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 용어를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('Term').delete().eq('id', term.id);
      if (error) throw error;

      toast.success('용어가 삭제되었습니다.');
      onDelete?.(term.id);
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <Card className="border-border overflow-hidden transition-all hover:shadow-md">
      <div className="flex flex-col">
        {/* Compact Row Header */}
        <div className="flex min-h-[3rem] items-center gap-4 px-4 py-2">
          {/* Left: Term Name & Aliases */}
          <div className="flex min-w-[150px] flex-col justify-center">
            <Link href={`/term/${term.name}`} className="hover:underline">
              <span className="text-foreground text-base font-bold">
                {term.name}
              </span>
            </Link>
          </div>

          {/* Center: Translations */}
          <div className="flex flex-1 flex-wrap gap-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={term.Translation.map((t) => t.id)}
                strategy={horizontalListSortingStrategy}
              >
                {term.Translation.map((trans) => (
                  <SortableBadge
                    key={trans.id}
                    translation={trans}
                    isSessionActive={!!session}
                    onClick={() =>
                      handleTranslationClick(
                        term.id,
                        trans.id,
                        !!trans.is_preferred,
                      )
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {term.note && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`text-muted-foreground hover:text-foreground transition-transform ${
                  isExpanded ? 'bg-muted rotate-180' : ''
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}

            {session && (
              <>
                <Link href={`/admin/edit/${term.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expanded Note Section */}
        {isExpanded && term.note && (
          <div className="border-border bg-muted/30 animate-in slide-in-from-top-2 fade-in border-t p-4 duration-200">
            <div className="text-muted-foreground prose dark:prose-invert max-w-none text-sm">
              <MarkdownViewer source={term.note} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
