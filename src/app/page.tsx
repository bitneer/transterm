'use client';

import { AppHeader } from '@/components/AppHeader';
import { SearchSection } from '@/components/SearchSection';

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen font-sans transition-colors duration-300">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <AppHeader />
        <SearchSection />
      </div>
    </div>
  );
}
