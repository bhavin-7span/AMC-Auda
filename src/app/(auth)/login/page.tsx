import { LoginForm } from './LoginForm';

/**
 * Login page for the AUDA FieldTrack Admin Panel. Standalone (no app shell).
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">AUDA FieldTrack</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Administration portal — sign in
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
