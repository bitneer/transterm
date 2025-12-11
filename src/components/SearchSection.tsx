'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { type Session } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { TermCard } from '@/components/TermCard';
import { TermWithTranslations } from '@/types';
import { Database } from '@/types/supabase'; // Import Database for sorting type safety
import { toast } from 'sonner';

interface SearchSectionProps {
  initialQuery?: string;
  initialResults?: TermWithTranslations[];
}

const DEFAULT_RESULTS: TermWithTranslations[] = [];

export function SearchSection({
  initialQuery = '',
  initialResults = DEFAULT_RESULTS,
}: SearchSectionProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] =
    useState<TermWithTranslations[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Track the latest query to prevent race conditions
  const lastQueryRef = useRef(query);

  // Auth Listener
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

  // Search Logic
  useEffect(() => {
    lastQueryRef.current = query;

    const fetchTerms = async () => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setResults(initialResults);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let translationPropIds: string[] = [];

        // 1. Find matched translations first
        // User requested to allow 1-char search for translations as well
        const { data: translationData } = await supabase
          .from('Translation')
          .select('term_id')
          .ilike('text', `%${trimmedQuery}%`)
          .limit(50); // Limit translation matches to avoid huge ID lists

        if (translationData) {
          translationPropIds = translationData.map((t) => t.term_id);
        }

        // 2. Find Terms (Name/Alias OR Matched Translation ID)
        let queryBuilder = supabase.from('Term').select('*, Translation(*)');

        if (translationPropIds.length > 0) {
          queryBuilder = queryBuilder.or(
            `name.ilike.${trimmedQuery}%,aliases.cs.{"${trimmedQuery.replace(/"/g, '\\"')}"},id.in.(${translationPropIds.join(',')})`,
          );
        } else {
          queryBuilder = queryBuilder.or(
            `name.ilike.${trimmedQuery}%,aliases.cs.{"${trimmedQuery.replace(/"/g, '\\"')}"}`,
          );
        }

        // Limit the final results to prevent UI clutter (FETCH LIMIT + 1 to detect hasMore)
        const limit = 10;
        const { data, error } = await queryBuilder
          .order('name')
          .limit(limit + 1);

        if (error) throw error;

        // Check race condition: if query changed while fetching, ignore this result
        if (query !== lastQueryRef.current) return;

        if (data) {
          const hasMore = data.length > limit;
          const displayData = hasMore ? data.slice(0, limit) : data;
          setHasMore(hasMore);

          // Data patching: sort translations and ensure at least one is preferred if translations exist
          const patchedData = displayData.map((term) => {
            if (term.Translation && term.Translation.length > 0) {
              // 1. Sort by sort_order
              term.Translation.sort(
                (
                  a: Database['public']['Tables']['Translation']['Row'],
                  b: Database['public']['Tables']['Translation']['Row'],
                ) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id),
              );

              // 2. Ensure at least one is preferred
              const hasPreferred = term.Translation.some(
                (tr: Database['public']['Tables']['Translation']['Row']) =>
                  tr.is_preferred,
              );
              if (!hasPreferred) {
                term.Translation[0].is_preferred = true;
              }
            }
            return term;
          });
          setResults(patchedData as TermWithTranslations[]);
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
      } finally {
        // Only turn off loading if we are still the latest query
        if (query === lastQueryRef.current) {
          setLoading(false);
        }
      }
    };

    const debounce = setTimeout(() => {
      fetchTerms();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, supabase, initialResults]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (!query.trim()) return;

      const exactMatch = results.find(
        (term) => term.name.toLowerCase() === query.trim().toLowerCase(),
      );

      if (exactMatch) {
        router.push(`/term/${encodeURIComponent(exactMatch.name)}`);
      } else {
        toast.info('목록에서 용어를 선택하거나 정확한 용어를 입력해주세요.');
      }
    }
  };

  return (
    <>
      <div className="relative mb-12">
        <div className="relative flex items-center">
          <Search
            className={`text-muted-foreground absolute left-4 h-5 w-5 transition-all duration-200 ${
              loading ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
            }`}
          />
          <Loader2
            className={`text-muted-foreground absolute left-4 h-5 w-5 animate-spin transition-all duration-200 ${
              loading ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          />
          <Input
            type="text"
            placeholder="검색할 용어를 입력하세요"
            className="bg-background border-input focus-visible:ring-primary w-full rounded-lg border py-6 pr-12 pl-12 text-lg shadow-sm transition-shadow focus-visible:shadow-md"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setLoading(true);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {query &&
        session &&
        !results.some(
          (term) => term.name.toLowerCase() === query.trim().toLowerCase(),
        ) && (
          <div className="-mt-8 mb-12 text-center">
            <Link
              href={`/admin/new?term=${encodeURIComponent(query)}`}
              className="text-primary text-sm hover:underline"
            >
              &quot;{query}&quot; 등록하기
            </Link>
          </div>
        )}

      <div className="space-y-6">
        <div>
          {results.map((term) => (
            <TermCard
              key={term.id}
              initialTerm={term}
              session={session}
              onDelete={(deletedId) => {
                setResults((prev) => prev.filter((t) => t.id !== deletedId));
              }}
            />
          ))}
        </div>

        {hasMore && (
          <div className="text-muted-foreground py-4 text-center text-sm">
            검색 결과가 더 있습니다. 검색어를 구체적으로 입력해주세요.
          </div>
        )}
      </div>
    </>
  );
}
