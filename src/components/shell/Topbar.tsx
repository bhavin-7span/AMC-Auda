"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { pageTitleFor, type NavSection } from "@/lib/nav/navigation";
import { NAV_ICONS } from "./nav-icons";

function istParts(now: Date) {
  const hour = Number(
    now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }),
  );
  return {
    greeting:
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening",
    date: now.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    time: now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** IST clock, filled in after hydration so prerendering never reads the clock. */
function useIstClock() {
  const [parts, setParts] = useState<ReturnType<typeof istParts> | null>(null);
  useEffect(() => {
    const tick = () => setParts(istParts(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return parts;
}

const roleText = (role: string) =>
  role.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Top bar for the Admin Panel shell: greeting and IST clock on the left/centre, the
 * signed-in account (with sign-out) on the right.
 */
export function Topbar({
  email,
  roleLabel,
}: {
  email: string | null;
  roleLabel: string;
}) {
  const clock = useIstClock();

  return (
    <header className="flex h-17 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-7">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {clock?.greeting ?? "Welcome"}
          {email ? `, ${roleText(roleLabel)}` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Operational overview for Ahmedabad field activities.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div data-testid="account-area">
          {email ? (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-11 gap-2.5 px-2"
                    aria-label="Account menu"
                  />
                }
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase"
                >
                  {email.slice(0, 2)}
                </span>
                <span className="hidden min-w-0 text-left leading-tight sm:block">
                  <span
                    className="block max-w-48 truncate text-sm font-semibold"
                    data-testid="account-email"
                  >
                    {email}
                  </span>
                  <span
                    className="block text-xs font-normal text-muted-foreground"
                    data-testid="role-label"
                  >
                    {roleText(roleLabel)}
                  </span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 gap-3 p-3">
                <PopoverHeader>
                  <PopoverTitle className="truncate">{email}</PopoverTitle>
                  <PopoverDescription>
                    Role: {roleText(roleLabel)}
                  </PopoverDescription>
                </PopoverHeader>
                <form action="/logout" method="post">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    data-testid="logout-button"
                  >
                    <LogOut /> Sign out
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
          ) : (
            <span
              className="text-xs text-muted-foreground"
              data-testid="role-label"
            >
              Role: {roleText(roleLabel)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Page header rendered above every page: breadcrumb, section eyebrow, title and
 * description, all derived from the route. Reading the pathname is runtime URL data on
 * dynamic routes (/attendance/<userId>), so AppShell renders this inside Suspense with a
 * pathname-less PageHeader as the fallback.
 */
export function RoutedPageHeader(props: {
  sections: NavSection[];
  loaded: boolean;
}) {
  return <PageHeader pathname={usePathname()} {...props} />;
}

export function PageHeader({
  pathname,
  sections,
  loaded,
}: {
  pathname: string | null;
  sections: NavSection[];
  loaded: boolean;
}) {
  if (pathname == null) return null;
  const match = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const section = sections.find((s) =>
    s.items.some((item) => match(item.href)),
  );
  const item = section?.items.find((i) => match(i.href));
  // Once the role is known, routes the caller's nav does not expose (e.g. a disabled
  // module that 404s) get no header.
  const page = loaded && !item ? null : pageTitleFor(pathname);
  if (!page) return null;

  const Icon = item ? NAV_ICONS[item.key] : undefined;
  const isChild = item != null && pathname !== item.href;

  return (
    <div className="mb-6 space-y-3">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span>AUDA FieldTrack</span>
        <ChevronRight className="size-3" />
        {item && isChild ? (
          <>
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
            <ChevronRight className="size-3" />
            <span className="font-medium text-foreground">
              {page.title === item.label ? "Details" : page.title}
            </span>
          </>
        ) : (
          <span className="font-medium text-foreground">{page.title}</span>
        )}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {section && (
            <p className="mb-1 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-widest text-info uppercase">
              {Icon ? <Icon className="size-3.5" /> : null}
              {section.label}
            </p>
          )}
          <h1
            className="text-2xl font-normal tracking-tight text-primary md:text-[1.75rem]"
            data-testid="page-title"
          >
            {page.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {page.description}
          </p>
        </div>
        <div
          id={PAGE_ACTIONS_ID}
          className="flex flex-wrap items-center gap-2 empty:hidden"
        />
      </div>
    </div>
  );
}

const PAGE_ACTIONS_ID = "page-header-actions";
const noopSubscribe = () => () => {};

/**
 * Renders a page's primary actions at the right of the shell's page header. The header
 * mounts before the page, so the slot is looked up after hydration.
 */
export function PageActions({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(
    noopSubscribe,
    () => document.getElementById(PAGE_ACTIONS_ID),
    () => null,
  );
  return slot ? createPortal(children, slot) : null;
}
