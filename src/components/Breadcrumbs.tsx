import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'text-muted-foreground flex items-center text-sm',
        className,
      )}
    >
      <ol className="flex items-center gap-2">
        <li>
          <Link
            href="/"
            className="hover:text-foreground flex items-center transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 opacity-50" />
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground font-medium transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-foreground font-semibold"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
