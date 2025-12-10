'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import '@uiw/react-markdown-preview/markdown.css';

const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), {
  ssr: false,
  loading: () => (
    <div className="h-[20px] w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
  ),
});

interface MarkdownViewerProps {
  source: string;
}

export default function MarkdownViewer({ source }: MarkdownViewerProps) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setColorMode(isDark ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div data-color-mode={colorMode}>
      <MarkdownPreview
        source={source}
        style={{
          backgroundColor: 'transparent',
          color: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit',
        }}
        wrapperElement={{
          'data-color-mode': colorMode,
        }}
      />
    </div>
  );
}
