'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { type Session } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { TermCard } from '@/components/TermCard';
import { TermWithTranslations } from '@/types';
import { Database } from '@/types/supabase'; // Import Database for sorting type safety
import { toast } from 'sonner';

interface SearchSectionProps {
  initialQuery?: string;
  initialResults?: TermWithTranslations[];
}

export function SearchSection({
  initialQuery = '',
  initialResults = [],
}: SearchSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] =
    useState<TermWithTranslations[]>(initialResults);
  const [loading, setLoading] = useState(false);

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
    // If query matches initialQuery, we might already have results (SSR).
    // But if user types, we fetch.
    // To simplify: if initialQuery is set and we haven't typed yet, don't fetch (rely on initialResults).
    // However, explicit fetching ensures client-side consistency.
    // Let's us a simplified debounce approach.

    // Skip fetch if query is exactly the initial one AND we have results?
    // Actually, allowing re-fetch is safer for consistency, but we want to avoid double-fetch on load.
    // Let's checking if query changed.

    // A simple way: just fetch. The initialResults are good for initial paint.
    // But we need to avoid "flashing" or overwriting SSR data with empty if the effect runs too early.
    // For now, let's just run the effect logic.

    const fetchTerms = async () => {
      if (!query.trim()) {
        setResults(initialResults);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('Term')
          .select('*, Translation(*)')
          // Use safe quoting for the array containment check
          .or(
            `name.ilike.${query}%,aliases.cs.{"${query.replace(/"/g, '\\"')}"}`,
          )
          .order('name');

        if (error) throw error;

        // Translation Sorting
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

        // Cast to correct type
        setResults(sortedData as unknown as TermWithTranslations[]);
      } catch (error) {
        console.error('Error fetching terms:', error);
      } finally {
        setLoading(false);
      }
    };

    // If this is the FIRST render and we have initialResults matching the query, skip fetch?
    // We can rely on the debounce.
    const debounce = setTimeout(() => {
      // Optimization: if query is exactly initialQuery and we have initialResults, maybe don't fetch?
      // But the user might have navigated back. Let's just fetch to be safe and 'live'.
      // To avoid Overwriting SSR data immediately, we could check.
      // But simplest perfect behavior is "always source of truth is DB".
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
      <div className="group relative mb-12">
        <div className="from-border to-primary/20 absolute -inset-0.5 rounded-lg bg-gradient-to-r opacity-20 blur transition duration-200 group-hover:opacity-40"></div>
        <div className="relative flex items-center">
          {loading ? (
            <Loader2 className="text-muted-foreground absolute left-4 h-5 w-5 animate-spin" />
          ) : (
            <Search className="text-muted-foreground absolute left-4 h-5 w-5" />
          )}
          <Input
            type="text"
            placeholder="검색할 용어를 입력하세요"
            className="bg-card border-border focus-visible:ring-primary w-full rounded-lg py-6 pl-12 text-lg shadow-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        <div className={loading ? 'opacity-50 transition-opacity' : ''}>
          {results.map((term) => (
            <TermCard key={term.id} initialTerm={term} session={session} />
          ))}
        </div>

        {query && results.length === 0 && (
          <div
            className={`text-muted-foreground py-12 text-center ${
              loading ? 'opacity-50 transition-opacity' : ''
            }`}
          >
            <p className="text-lg">검색 결과가 없습니다.</p>
            {session && (
              <>
                <p className="mt-2 text-sm">새로운 용어를 추가해보세요!</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    router.push(`/admin/new?term=${encodeURIComponent(query)}`)
                  }
                >
                  용어 추가하기
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
