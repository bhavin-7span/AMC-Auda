import { notFound } from 'next/navigation';
import { KitDemo } from './KitDemo';

/**
 * UI-kit showcase for the shared Admin Panel components (Task 0.6). Living
 * documentation + an E2E target for the components. Dev/preview only — returns 404 in
 * production so it is never a public surface there. Not linked in production nav.
 */
export default function KitPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">UI Kit</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Shared components used across the Admin Panel.
        </p>
      </div>
      <KitDemo />
    </main>
  );
}
