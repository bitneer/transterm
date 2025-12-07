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

        // Translation 정렬 (선호 대역어 우선)
        const sortedData =
          data?.map((term) => ({
            ...term,
            Translation: term.Translation.sort(
              (a: any, b: any) =>
                (b.is_preferred ? 1 : 0) - (a.is_preferred ? 1 : 0)
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

    // Optimistic Update
    setResults((prevResults) =>
      prevResults.map((term) => {
        if (term.id === termId) {
          const updatedTranslations = term.Translation.map((t) => {
            if (t.id === translationId) {
              return { ...t, is_preferred: !currentPreferred };
            }
            return t;
          }).sort(
            (a, b) => (b.is_preferred ? 1 : 0) - (a.is_preferred ? 1 : 0)
          );
          return { ...term, Translation: updatedTranslations };
        }
        return term;
      })
    );

    try {
      const { error } = await supabase
        .from("Translation")
        .update({ is_preferred: !currentPreferred })
        .eq("id", translationId);

      if (error) throw error;
      toast.success("우선순위가 변경되었습니다.");
    } catch (error) {
      console.error("Error updating translation preference:", error);
      toast.error("변경 사항을 저장하지 못했습니다.");
      // In a real app, we should rollback here
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
                      {term.Translation.map((trans) => (
                        <Badge
                          key={trans.id}
                          variant={trans.is_preferred ? "default" : "secondary"}
                          className={`text-sm py-1 px-3 transition-all ${
                            session
                              ? "cursor-pointer hover:scale-105 active:scale-95"
                              : "cursor-default"
                          } ${
                            trans.is_preferred
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          onClick={() =>
                            handleTranslationClick(
                              term.id,
                              trans.id,
                              !!trans.is_preferred
                            )
                          }
                        >
                          {trans.text}
                          {trans.is_preferred && (
                            <Star className="w-3 h-3 ml-1 fill-current" />
                          )}
                        </Badge>
                      ))}
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
