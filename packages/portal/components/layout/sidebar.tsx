"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/overview", label: "Overview", icon: "\u2302" },
  { href: "/agents", label: "Agents", icon: "\u2699" },
  { href: "/credentials", label: "Credentials", icon: "\u26BF" },
  { href: "/sessions", label: "Sessions", icon: "\u21C4" },
  { href: "/commitments", label: "Commitments", icon: "\u2611" },
  { href: "/analytics", label: "Analytics", icon: "\u2261" },
  { href: "/settings", label: "Settings", icon: "\u2630" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-navy-800 px-6">
        <Link href="/" className="text-lg font-bold text-white">
          Attest<span className="text-accent">ara</span>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="text-gray-400 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/overview"
              ? pathname === "/overview"
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger — rendered in the header on small screens */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md border border-navy-800 bg-navy-950 p-2 text-gray-400 hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        {"\u2630"}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-navy-800 bg-navy-950 transition-transform lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-navy-800 bg-navy-950">
        {navContent}
      </aside>
    </>
  );
}
