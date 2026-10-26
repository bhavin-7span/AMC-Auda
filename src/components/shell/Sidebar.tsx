'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { NavSection } from '@/lib/nav/navigation';

/**
 * Responsive sidebar navigation for the Admin Panel shell.
 *
 * Receives an already role-filtered nav tree (filtering happens server-side). This
 * component only handles presentation: active-link highlighting and the mobile
 * open/close toggle.
 */
export function Sidebar({ sections, roleLabel }: { sections: NavSection[]; roleLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="flex items-center justify-between border-b border-black/10 p-3 md:hidden dark:border-white/15">
        <span className="font-semibold">AUDA FieldTrack</span>
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded border border-black/10 px-3 py-1 text-sm dark:border-white/15"
        >
          Menu
        </button>
      </div>

      <nav
        aria-label="Primary"
        data-testid="sidebar"
        className={`${
          open ? 'block' : 'hidden'
        } border-b border-black/10 bg-white md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0 dark:border-white/15 dark:bg-zinc-950`}
      >
        <div className="hidden items-center gap-2 p-4 md:flex">
          <span className="text-lg font-semibold tracking-tight">AUDA FieldTrack</span>
        </div>
        <p className="px-4 pb-2 text-xs text-zinc-500" data-testid="role-label">
          Role: {roleLabel}
        </p>

        <ul className="space-y-4 p-3">
          {sections.map((section) => (
            <li key={section.key}>
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        data-testid={`nav-${item.key}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={`block rounded px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-black/[.06] font-medium dark:bg-white/[.08]'
                            : 'text-zinc-700 hover:bg-black/[.04] dark:text-zinc-300 dark:hover:bg-white/[.06]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
