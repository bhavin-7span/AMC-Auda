import { PageLoader } from '@/components/ui/page-loader';

/**
 * Route-segment loading fallback. Each server-data route re-exports this as its
 * `loading.tsx`, so navigation keeps the shell and shows the shared loader.
 */
export default function PageLoading() {
  return <PageLoader />;
}
