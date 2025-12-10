'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface TermSearchInputProps {
  initialQuery?: string;
}

export function TermSearchInput({ initialQuery = '' }: TermSearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (query.trim()) {
        router.push(`/term/${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
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
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
