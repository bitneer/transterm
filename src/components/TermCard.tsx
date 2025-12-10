'use client';

import { useState, useEffect } from 'react';
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
  mode?: 'compact' | 'detail';
}

export function TermCard({
  initialTerm,
  session,
  onDelete,
  mode = 'compact',
}: TermCardProps & { onDelete?: (id: number) => void }) {
  const [term, setTerm] = useState(initialTerm);
  const [isExpanded, setIsExpanded] = useState(mode === 'detail');
  const supabase = createClient();

  // Ensure isExpanded is true if mode is detail (though we might want to allow collapsing even in detail mode? User said "Note 내용 항상 표시")
  // User said "Note 내용을 항상 표시 (확장/축소 버튼 없이)".
  // So if mode === 'detail', isExpanded should be effectively ignored or always true, and toggle hidden.

  useEffect(() => {
    if (mode === 'detail') setIsExpanded(true);
  }, [mode]);

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
    <Card className="border-border grid gap-0 overflow-hidden py-0 transition-all hover:shadow-md">
      <div className="flex flex-col">
        {/* Compact Row Header */}
        <div
          className={`flex items-center gap-4 ${
            mode === 'detail' ? 'min-h-[5rem] p-6' : 'min-h-[3rem] px-4 py-2'
          }`}
        >
          {/* Left: Term Name & Aliases */}
          <div className="flex min-w-[150px] flex-col justify-center">
            <Link href={`/term/${term.name}`} className="hover:underline">
              <span
                className={`text-foreground font-bold ${
                  mode === 'detail' ? 'text-3xl' : 'text-base'
                }`}
              >
                {term.name}
              </span>
            </Link>
            {mode === 'detail' && term.aliases && term.aliases.length > 0 && (
              <span className="text-muted-foreground mt-1 text-sm">
                ({term.aliases.join(', ')})
              </span>
            )}
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
            {term.note && mode !== 'detail' && (
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
        {(isExpanded || mode === 'detail') && term.note && (
          <div
            className={`border-border animate-in slide-in-from-top-2 fade-in border-t bg-slate-100 duration-200 dark:bg-slate-900 ${
              mode === 'detail' ? 'p-6' : 'p-4'
            }`}
          >
            <div className="text-muted-foreground prose dark:prose-invert max-w-none text-sm">
              <MarkdownViewer source={term.note} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
