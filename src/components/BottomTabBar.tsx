"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      />
      <path d="M4 9.5h16M8 3v3M16 3v3" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 20V13M11 20V7M18 20v-6"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="5" cy="12" r={active ? 1.7 : 1.4} fill="currentColor" />
      <circle cx="12" cy="12" r={active ? 1.7 : 1.4} fill="currentColor" />
      <circle cx="19" cy="12" r={active ? 1.7 : 1.4} fill="currentColor" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", Icon: TodayIcon },
  { href: "/week", label: "Plan", Icon: PlanIcon },
  { href: "/weight", label: "Progress", Icon: ProgressIcon },
  { href: "/settings", label: "More", Icon: MoreIcon },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/85"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2">
        {TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={pathname === tab.href} />
        ))}

        <Link
          href="/log"
          aria-label="Quick add"
          className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tennessee text-white shadow-lg shadow-tennessee/30 transition-transform active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </svg>
        </Link>

        {TABS.slice(2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={pathname === tab.href} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: (props: { active: boolean }) => React.ReactElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
        active ? "text-tennessee" : "text-neutral-400 dark:text-neutral-500"
      }`}
    >
      <Icon active={active} />
      {label}
    </Link>
  );
}
