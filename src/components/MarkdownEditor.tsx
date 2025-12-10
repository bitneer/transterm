'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
  ),
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  height?: number | string;
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 200,
}: MarkdownEditorProps) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial mode
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setColorMode(isDark ? 'dark' : 'light');
    };

    checkTheme();

    // Observer for class changes on html element (Next.js / Tailwind typical setup)
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
    <div data-color-mode={colorMode} className="h-full w-full">
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="edit"
        visibleDragbar={false}
        className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
        textareaProps={{
          placeholder: 'Markdown을 지원합니다. (예: **Bold**, - List)',
        }}
      />
    </div>
  );
}
