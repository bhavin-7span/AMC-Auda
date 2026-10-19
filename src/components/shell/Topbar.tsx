/**
 * Top bar for the Admin Panel shell (desktop). Shows the signed-in account and a
 * sign-out control (POST to /logout, which invalidates the session server-side).
 */
export function Topbar({ email }: { email: string | null }) {
  return (
    <header className="hidden items-center justify-between border-b border-black/10 px-6 py-3 md:flex dark:border-white/15">
      <div className="text-sm text-zinc-500">Web Administration, Dashboard &amp; MIS</div>
      <div className="flex items-center gap-3 text-sm" data-testid="account-area">
        {email ? (
          <>
            <span className="text-zinc-600 dark:text-zinc-400" data-testid="account-email">
              {email}
            </span>
            <form action="/logout" method="post">
              <button
                type="submit"
                data-testid="logout-button"
                className="rounded-md border border-black/15 px-3 py-1 transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <span>Not signed in</span>
        )}
      </div>
    </header>
  );
}
