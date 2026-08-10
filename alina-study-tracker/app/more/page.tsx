"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NAV } from "@/components/Shell";
import { Card, PageHeader } from "@/components/ui";

/** Reachable only from the phone bottom bar — desktop has the full sidebar. */
export default function MorePage() {
  return (
    <div>
      <PageHeader title="Everything else" />
      <Card className="!p-0 overflow-hidden">
        <ul>
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 border-b px-4 py-3.5 text-sm font-medium last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <Icon size={18} style={{ color: "var(--accent)" }} />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} className="muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
