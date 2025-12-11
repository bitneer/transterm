import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="mb-12 space-y-4 text-center">
      <Link href="/" className="inline-block">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
          Trans<span className="text-primary/60">Term</span>
        </h1>
      </Link>
      <p className="text-muted-foreground text-lg">
        용어 대역어 for{' '}
        <a
          href="https://www.bitneer.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary decoration-primary/40 hover:decoration-primary font-medium underline decoration-dotted underline-offset-4 transition-colors"
        >
          bitneer.dev
        </a>
      </p>
    </header>
  );
}
