import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Phase 0 landing page: minimal app shell that also confirms backend connectivity
 * to the existing Auda RFP Supabase project. Replaced by the real dashboard shell
 * in a later phase.
 *
 * The static shell prerenders; the backend check streams in via <Suspense> because
 * it reads per-request cookies / queries the database (Next 16 cacheComponents).
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AUDA FieldTrack</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Web Administration, Dashboard &amp; MIS portal
        </p>
      </div>

      <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-medium text-zinc-500">Backend connection</h2>
        <Suspense fallback={<BackendStatus state="checking" />}>
          <BackendCheck />
        </Suspense>
      </div>
    </main>
  );
}

async function BackendCheck() {
  let ok = false;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    const { error: queryError } = await supabase
      .from('departments')
      .select('id', { count: 'exact', head: true });
    if (queryError) error = queryError.message;
    else ok = true;
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error';
  }

  return <BackendStatus state={ok ? 'connected' : 'error'} error={error} />;
}

function BackendStatus({
  state,
  error,
}: {
  state: 'checking' | 'connected' | 'error';
  error?: string | null;
}) {
  const dot =
    state === 'connected' ? 'bg-green-500' : state === 'checking' ? 'bg-amber-400' : 'bg-red-500';
  const label =
    state === 'connected'
      ? 'Connected to Auda RFP (Supabase)'
      : state === 'checking'
        ? 'Checking…'
        : `Not connected: ${error ?? 'unknown error'}`;

  return (
    <p className="mt-1 flex items-center gap-2 text-sm">
      <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      <span data-testid="backend-status">{label}</span>
    </p>
  );
}
