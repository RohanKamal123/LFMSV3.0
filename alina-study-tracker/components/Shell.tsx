"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Cloud,
  CloudOff,
  GraduationCap,
  Home,
  ListChecks,
  Loader2,
  Settings as SettingsIcon,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { daysToExam } from "@/lib/selectors";

const NAV = [
  { href: "/", label: "Today", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/schedule", label: "Schedule", icon: ClipboardList },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/homework", label: "Homework", icon: ListChecks },
  { href: "/exams", label: "Results", icon: TrendingUp },
  { href: "/study", label: "Study timer", icon: Timer },
  { href: "/routines", label: "Routine & goals", icon: GraduationCap },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** The five that fit a phone's bottom bar. */
const MOBILE_NAV = [NAV[0], NAV[1], NAV[4], NAV[5], NAV[7]];

function SyncBadge() {
  const { syncStatus, cloudConfigured } = useStore();
  if (!cloudConfigured) return null;

  if (syncStatus.kind === "syncing") {
    return (
      <span className="chip" title="Syncing">
        <Loader2 size={12} className="animate-spin" /> Syncing
      </span>
    );
  }
  if (syncStatus.kind === "error") {
    return (
      <span className="chip" style={{ color: "var(--bad)" }} title={syncStatus.message}>
        <CloudOff size={12} /> Sync failed
      </span>
    );
  }
  if (syncStatus.kind === "idle") {
    return (
      <span className="chip" style={{ color: "var(--good)" }} title="Saved to the cloud">
        <Cloud size={12} /> Synced
      </span>
    );
  }
  return (
    <span className="chip" title="Saved in this browser only">
      <CloudOff size={12} /> Local
    </span>
  );
}

function ThemeSync() {
  const { state } = useStore();
  const theme = state.settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, ready } = useStore();
  const left = daysToExam(state);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen">
      <ThemeSync />

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r px-3 py-4 lg:flex"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <Link href="/" className="mb-1 flex items-center gap-2 px-2 py-1">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {(state.settings.studentName || "A").slice(0, 1).toUpperCase()}
          </span>
          <span>
            <span className="block text-sm font-bold leading-tight">
              {state.settings.studentName || "Study"} Tracker
            </span>
            <span className="muted block text-[11px] leading-tight">SSC candidate</span>
          </span>
        </Link>

        <div
          className="mx-2 my-3 rounded-xl px-3 py-2.5"
          style={{ background: "var(--accent-soft)" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            SSC exam
          </div>
          <div className="text-lg font-bold leading-tight">
            {left > 0 ? `${left} days left` : left === 0 ? "Exam today" : "Exams done"}
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={
                isActive(href)
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--muted)" }
              }
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 pt-3">
          <SyncBadge />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-4 py-3 lg:hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {(state.settings.studentName || "A").slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-bold">
            {left > 0 ? `${left} days to SSC` : left === 0 ? "Exam day" : "Exams done"}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <SyncBadge />
          <Link href="/settings" className="btn btn-ghost !px-2 !py-1.5" aria-label="Settings">
            <SettingsIcon size={16} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:pl-64 lg:pb-10">
        {ready ? children : <div className="muted py-20 text-center text-sm">Loading…</div>}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t lg:hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
            style={{ color: isActive(href) ? "var(--accent)" : "var(--muted)" }}
          >
            <Icon size={19} />
            <span className="truncate px-0.5">{label}</span>
          </Link>
        ))}
        <Link
          href="/more"
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
          style={{ color: isActive("/more") ? "var(--accent)" : "var(--muted)" }}
        >
          <Users size={19} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

export { NAV };
