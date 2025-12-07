"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { type Session } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBadge } from "@/components/SortableBadge";
import type { Database } from "@/types/supabase";

type TermWithTranslations = Database["public"]["Tables"]["Term"]["Row"] & {
  Translation: Database["public"]["Tables"]["Translation"]["Row"][];
};

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
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
  }, []);

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
          .from("Term")
          .select(
            `
            *,
            Translation (*)
          `
          )
          .or(`name.ilike.%${query}%,aliases.cs.{${query}}`) // ilike: 대소문자 무시 포함, cs: 배열 포함
          .order("name");

        if (error) throw error;

        // Translation 정렬 (sort_order 기준)
        const sortedData =
          data?.map((term) => ({
            ...term,
            Translation: term.Translation.sort(
              (a: any, b: any) =>
                (a.sort_order ?? a.id) - (b.sort_order ?? b.id)
            ),
          })) || [];

        setResults(sortedData);
      } catch (error) {
        console.error("Error fetching terms:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchTerms, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleTranslationClick = async (
    termId: number,
    translationId: number,
    currentPreferred: boolean
  ) => {
    if (!session) return;
    if (currentPreferred) return; // Already preferred (at front), do nothing

    const termIndex = results.findIndex((t) => t.id === termId);
    if (termIndex === -1) return;
    const term = results[termIndex];

    const clickedIndex = term.Translation.findIndex(
      (t) => t.id === translationId
    );
    if (clickedIndex === -1) return;

    // Move to front
    const newTranslations = arrayMove(term.Translation, clickedIndex, 0).map(
      (t, index) => ({
        ...t,
        sort_order: index,
        is_preferred: index === 0,
      })
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
          .from("Translation")
          .update({ sort_order: t.sort_order, is_preferred: t.is_preferred })
          .eq("id", t.id)
      );

      const updateResults = await Promise.all(updates);
      const isError = updateResults.some((r) => r.error);
      if (isError) throw new Error("Some updates failed");

      toast.success("선호 대역어로 설정되었습니다.");
    } catch (error) {
      console.error("Error updating translation preference:", error);
      toast.error("변경 사항을 저장하지 못했습니다.");
      // Rollback logic would go here
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, termId: number) => {
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
      })
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
          .from("Translation")
          .update({ sort_order: t.sort_order, is_preferred: t.is_preferred })
          .eq("id", t.id)
      );
      await Promise.all(updates);
    } catch (error) {
      console.error("Error updating sort order:", error);
      toast.error("순서 저장에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Trans<span className="text-blue-600">Term</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            용어 대역어 for bitneer.dev
          </p>
        </header>

        {/* Search Bar */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-200"></div>
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="검색할 용어를 입력하세요 (예: Context, Interface)"
              className="w-full pl-12 py-6 text-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-lg focus-visible:ring-blue-500"
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
                <Card
                  key={i}
                  className="border-slate-200 dark:border-slate-800"
                >
                  <CardHeader className="pb-2">
                    <Skeleton className="h-8 w-1/3 mb-2" />
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
                  className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-baseline gap-3">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {term.name}
                      </CardTitle>
                      {term.aliases && term.aliases.length > 0 && (
                        <span className="text-sm text-slate-500">
                          ({term.aliases.join(", ")})
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
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
                                  !!trans.is_preferred
                                )
                              }
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>

                    {term.Translation.some((t) => t.usage) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        {term.Translation.filter((t) => t.usage).map((t) => (
                          <div key={t.id} className="text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {t.text}:
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 ml-2">
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
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg">검색 결과가 없습니다.</p>
              {session && (
                <>
                  <p className="text-sm mt-2">새로운 용어를 추가해보세요!</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => (window.location.href = "/admin/new")}
                  >
                    용어 추가하기
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-slate-400">
          <p>© 2025 TransTerm. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
