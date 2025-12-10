'use client';

import { useState, useEffect, useRef } from 'react';
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
      if (!query.trim()) {
        setResults(initialResults);
        setLoading(false);
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

        // Check race condition: if query changed while fetching, ignore this result
        if (query !== lastQueryRef.current) return;

        if (data) {
          // Data patching: sort translations and ensure at least one is preferred if translations exist
          const patchedData = data.map((term) => {
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
      <div className="group relative mb-12">
        <div className="from-border to-primary/20 absolute -inset-0.5 rounded-lg bg-gradient-to-r opacity-20 blur transition duration-200 group-hover:opacity-40"></div>
        <div className="relative flex items-center">
          <Search className="text-muted-foreground absolute left-4 h-5 w-5" />
          <Input
            type="text"
            placeholder="검색할 용어를 입력하세요"
            className="bg-card border-border focus-visible:ring-primary w-full rounded-lg py-6 pr-12 pl-12 text-lg shadow-xl"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setLoading(true);
            }}
            onKeyDown={handleKeyDown}
          />
          <Loader2
            className={`text-muted-foreground absolute right-4 h-5 w-5 animate-spin transition-opacity duration-200 ${
              loading ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>

      {query &&
        session &&
        !loading &&
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

        {query && results.length === 0 && !loading && (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-lg">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
