"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/lib/nav/navigation";
import { NAV_ICONS } from "./nav-icons";

/**
 * Responsive sidebar navigation for the Admin Panel shell.
 *
 * Receives an already role-filtered nav tree (filtering happens server-side). This
 * component only handles presentation: active-link highlighting and the mobile
 * open/close toggle. The brand (top) stays fixed; only the nav list scrolls. Account
 * details and sign-out live in the top bar.
 */
export function Sidebar({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <div className="flex items-center justify-between bg-sidebar px-3 py-2.5 text-sidebar-foreground md:hidden">
        <span className="flex items-center gap-2 font-semibold">
          <Image
            src="/assets/logo.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-lg bg-white object-cover"
          />
          AUDA FieldTrack
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <Menu />
        </Button>
      </div>

      <nav
        aria-label="Primary"
        data-testid="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground",
          open ? "flex" : "hidden",
          "max-h-[calc(100vh-3.25rem)] flex-col md:flex md:h-screen md:max-h-none md:w-65 md:shrink-0",
        )}
      >
        <div className="hidden h-17 shrink-0 items-center gap-3 border-b border-sidebar-border px-5 md:flex">
          <Image
            src="/assets/logo.png"
            alt="Ahmedabad Urban Development Authority"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-lg bg-white object-cover"
          />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-white">
              AUDA
            </p>
            <p className="text-xs text-white/60">FieldTrack</p>
          </div>
        </div>

        <Suspense
          fallback={
            <NavList sections={sections} pathname={null} onNavigate={close} />
          }
        >
          <ActiveNavList sections={sections} onNavigate={close} />
        </Suspense>
      </nav>
    </>
  );
}

/**
 * Nav links with active-route highlighting. Reading the pathname is runtime URL data on
 * dynamic routes (/attendance/<userId>), so it sits in its own Suspense boundary; the
 * fallback renders the same links without highlighting.
 */
function ActiveNavList({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate: () => void;
}) {
  return (
    <NavList
      sections={sections}
      pathname={usePathname()}
      onNavigate={onNavigate}
    />
  );
}

function NavList({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <ul className="scrollbar-thumb min-h-0 flex-1 space-y-5 overflow-y-auto px-3.5 py-5">
      {sections.map((section) => (
        <li key={section.key}>
          <p className="px-3 pb-2 text-[0.625rem] font-bold tracking-widest text-white/65 uppercase">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname != null &&
                (pathname === item.href ||
                  pathname.startsWith(`${item.href}/`));
              const Icon = NAV_ICONS[item.key];
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    data-testid={`nav-${item.key}`}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex h-9.5 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {Icon ? <Icon className="size-4 shrink-0" /> : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
