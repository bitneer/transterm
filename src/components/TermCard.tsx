'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
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
import { TermWithTranslations } from '@/types';
import { Session } from '@supabase/supabase-js';

interface TermCardProps {
  initialTerm: TermWithTranslations;
  session: Session | null;
}

export function TermCard({ initialTerm, session }: TermCardProps) {
  const [term, setTerm] = useState(initialTerm);
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

  return (
    <Card className="border-border overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-3">
            {/* Make Title a Link to the SSR page */}
            <Link href={`/term/${term.name}`} className="hover:underline">
              <CardTitle className="text-foreground text-2xl font-bold">
                {term.name}
              </CardTitle>
            </Link>
            {term.aliases && term.aliases.length > 0 && (
              <span className="text-muted-foreground text-sm">
                ({term.aliases.join(', ')})
              </span>
            )}
          </div>
          {session && (
            <Link href={`/admin/edit/${term.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
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

        {term.note && (
          <div className="border-border text-muted-foreground mt-4 border-t pt-4 text-sm">
            <span className="text-foreground mr-2 font-semibold">Note:</span>
            {term.note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
