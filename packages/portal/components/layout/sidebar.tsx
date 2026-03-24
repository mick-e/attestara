"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: "\u2302" },
  { href: "/agents", label: "Agents", icon: "\u2699" },
  { href: "/credentials", label: "Credentials", icon: "\u26BF" },
  { href: "/sessions", label: "Sessions", icon: "\u21C4" },
  { href: "/commitments", label: "Commitments", icon: "\u2611" },
  { href: "/analytics", label: "Analytics", icon: "\u2261" },
  { href: "/settings", label: "Settings", icon: "\u2630" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-navy-800 bg-navy-950">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-navy-800 px-6">
        <Link href="/" className="text-lg font-bold text-white">
          Agent<span className="text-accent">Clear</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-gray-400 hover:bg-navy-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-navy-800 px-6 py-4">
        <p className="text-xs text-gray-600">Attestara v0.1.0</p>
      </div>
    </aside>
  );
}
