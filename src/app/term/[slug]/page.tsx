import { createClient } from '@/utils/supabase/server';
import { AppHeader } from '@/components/AppHeader';
import { SearchSection } from '@/components/SearchSection';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TermWithTranslations } from '@/types';
import { Metadata } from 'next';

export const revalidate = 0; // Disable static caching for dynamic search

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getTerms(slug: string): Promise<TermWithTranslations[]> {
  const supabase = await createClient();
  const decodedSlug = decodeURIComponent(slug);
  console.log('Search Debug - Input Slug:', slug);
  console.log('Search Debug - Decoded Slug:', decodedSlug);

  // Quote the value for array containment to handle special chars/spaces safely
  // Note: We need to escape double quotes if they exist in the slug
  const safeSlug = decodedSlug.replace(/"/g, '\\"');

  const { data, error } = await supabase
    .from('Term')
    .select('*, Translation(*)')
    .or(`name.ilike.${decodedSlug},aliases.cs.{"${safeSlug}"}`)
    .order('name');

  console.log('Search Debug - Query Error:', error);
  console.log('Search Debug - Data Length:', data?.length);

  if (error) {
    console.error('Error fetching terms:', error);
    return [];
  }

  // Cast specific type for sorting to avoid inference issues
  const rawData = data as unknown as TermWithTranslations[];

  // Translation Sorting
  return (
    rawData?.map((term) => ({
      ...term,
      Translation: term.Translation.sort(
        (a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id),
      ),
    })) || []
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const terms = await getTerms(slug);
  const termName = terms.length > 0 ? terms[0].name : decodeURIComponent(slug);

  return {
    title: `${termName} - TransTerm`,
    description: `Translation for ${termName}`,
  };
}

export default async function TermPage({ params }: PageProps) {
  const { slug } = await params;
  const terms = await getTerms(slug);
  // Need to get session here only if we want to pass it? No, SearchSection handles its own session.
  // Actually, SearchSection handles session. So we don't need to fetch it here unless for SSR condition logic?
  // But SearchSection is a client component, it will fetch session on mount.

  const decodedSlug = decodeURIComponent(slug);

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <AppHeader />

        <div className="mb-8">
          <Breadcrumbs items={[{ label: decodedSlug }]} />
        </div>

        <SearchSection initialResults={terms} />
      </div>
    </div>
  );
}
