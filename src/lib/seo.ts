import { useEffect } from 'react';

/** Set document title + meta description per page (no extra dependency). */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const base = 'Steinbrenner FBLA';
    document.title = title ? `${title} · ${base}` : `${base} · Future Business Leaders of America`;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
      m.setAttribute('content', description);
    }
  }, [title, description]);
}
