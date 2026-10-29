'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * URL-backed list filters for the server-rendered list screens. Exposes a debounced
 * free-text search (`searchParam`, default `q`), an `apply(formData)` for a filter sheet
 * form (rewrites every key in `filterKeys`), `clear()`, `setParam()` for tabs/toggles,
 * and how many filter keys are active. Every change resets `page`.
 */
export function useUrlFilters({
  filterKeys = [],
  searchParam = 'q',
}: { filterKeys?: string[]; searchParam?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get(searchParam) ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  // Follow external URL changes (back/forward, clear) without clobbering typing.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete('page');
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }

  useEffect(() => {
    if (search.trim() === urlSearch) return;
    const timer = setTimeout(() => {
      navigate((p) => (search.trim() ? p.set(searchParam, search.trim()) : p.delete(searchParam)));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce keyed on input only
  }, [search]);

  return {
    search,
    setSearch,
    searchParams,
    /** Key for filter forms so their defaultValues track the applied URL. */
    formKey: searchParams.toString(),
    activeCount: filterKeys.filter((key) => searchParams.get(key)).length,
    apply(formData: FormData) {
      navigate((p) => {
        for (const key of filterKeys) {
          const value = String(formData.get(key) ?? '').trim();
          if (value) p.set(key, value);
          else p.delete(key);
        }
      });
    },
    clear() {
      navigate((p) => filterKeys.forEach((key) => p.delete(key)));
    },
    setParam(key: string, value: string | null) {
      navigate((p) => (value ? p.set(key, value) : p.delete(key)));
    },
  };
}
