'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Session } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
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
import type { Database } from '@/types/supabase';

type TermWithTranslations = Database['public']['Tables']['Term']['Row'] & {
  Translation: Database['public']['Tables']['Translation']['Row'][];
};

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TermWithTranslations[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    const fetchTerms = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Supabase Query: 이름이나 이명에 검색어가 포함된 용어 조회
        // 참고: 실제 프로덕션에서는 text search 기능을 활용하는 것이 더 좋음
        const { data, error } = await supabase
          .from('Term')
          .select(
            `
            *,
            Translation (*)
          `,
          )
          .or(`name.ilike.%${query}%,aliases.cs.{${query}}`) // ilike: 대소문자 무시 포함, cs: 배열 포함
          .order('name');

        if (error) throw error;

        // Translation 정렬 (sort_order 기준)
        const sortedData =
          data?.map((term) => ({
            ...term,
            Translation: term.Translation.sort(
              (
                a: Database['public']['Tables']['Translation']['Row'],
                b: Database['public']['Tables']['Translation']['Row'],
              ) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id),
            ),
          })) || [];

        setResults(sortedData);
      } catch (error) {
        console.error('Error fetching terms:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchTerms, 300);
    return () => clearTimeout(debounce);
  }, [query, supabase]);

  const handleTranslationClick = async (
    termId: number,
    translationId: number,
    currentPreferred: boolean,
  ) => {
    if (!session) return;
    if (currentPreferred) return; // Already preferred (at front), do nothing

    const termIndex = results.findIndex((t) => t.id === termId);
    if (termIndex === -1) return;
    const term = results[termIndex];

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
    setResults((prev) => {
      const newResults = [...prev];
      newResults[termIndex] = { ...term, Translation: newTranslations };
      return newResults;
    });

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

      // Rollback
      setResults((prev) => {
        const newResults = [...prev];
        newResults[termIndex] = term; // Restore original term
        return newResults;
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent, termId: number) => {
    if (!session) return;
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const termIndex = results.findIndex((t) => t.id === termId);
    if (termIndex === -1) return;

    const term = results[termIndex];
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

    setResults((prev) => {
      const newResults = [...prev];
      newResults[termIndex] = { ...term, Translation: newTranslations };
      return newResults;
    });

    // Backend Update
    try {
      // Update each item's sort_order and is_preferred status
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

      // Rollback
      setResults((prev) => {
        const newResults = [...prev];
        newResults[termIndex] = term; // Restore original term
        return newResults;
      });
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen font-sans transition-colors duration-300">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <header className="mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Trans<span className="text-primary/60">Term</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            용어 대역어 for bitneer.dev
          </p>
        </header>

        {/* Search Bar */}
        <div className="group relative mb-12">
          <div className="from-border to-primary/20 absolute -inset-0.5 rounded-lg bg-gradient-to-r opacity-20 blur transition duration-200 group-hover:opacity-40"></div>
          <div className="relative flex items-center">
            <Search className="text-muted-foreground absolute left-4 h-5 w-5" />
            <Input
              type="text"
              placeholder="검색할 용어를 입력하세요"
              className="bg-card border-border focus-visible:ring-primary w-full rounded-lg py-6 pl-12 text-lg shadow-xl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading
            ? // Loading Skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardHeader className="pb-2">
                    <Skeleton className="mb-2 h-8 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : results.map((term) => (
                <Card
                  key={term.id}
                  className="border-border overflow-hidden transition-all hover:shadow-lg"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-baseline gap-3">
                      <CardTitle className="text-foreground text-2xl font-bold">
                        {term.name}
                      </CardTitle>
                      {term.aliases && term.aliases.length > 0 && (
                        <span className="text-muted-foreground text-sm">
                          ({term.aliases.join(', ')})
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, term.id)}
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

                    {term.Translation.some((t) => t.usage) && (
                      <div className="border-border mt-4 space-y-2 border-t pt-4">
                        {term.Translation.filter((t) => t.usage).map((t) => (
                          <div key={t.id} className="text-sm">
                            <span className="text-foreground font-semibold">
                              {t.text}:
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {t.usage}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

          {!loading && query && results.length === 0 && (
            <div className="text-muted-foreground py-12 text-center">
              <p className="text-lg">검색 결과가 없습니다.</p>
              {session && (
                <>
                  <p className="mt-2 text-sm">새로운 용어를 추가해보세요!</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => (window.location.href = '/admin/new')}
                  >
                    용어 추가하기
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
