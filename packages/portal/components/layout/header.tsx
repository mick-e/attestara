"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/ui/wallet-button";
import { LiveIndicator } from "@/components/ui/live-indicator";

export function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-navy-800 bg-navy-900 px-6">
      <div className="flex items-center gap-4 pl-10 lg:pl-0">
        <h2 className="text-sm font-medium text-gray-400">
          Acme Procurement GmbH
        </h2>
        <LiveIndicator active />
      </div>

      <div className="flex items-center gap-4">
        <WalletButton />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-accent hover:bg-accent/30 transition-colors"
          >
            M
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-navy-800 bg-navy-900 py-1 shadow-lg z-50">
              <div className="border-b border-navy-800 px-4 py-3">
                <p className="text-sm font-medium text-white">Maria Schmidt</p>
                <p className="text-xs text-gray-400">
                  maria@acme-procurement.eu
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-navy-800 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Organization Settings
                </Link>
                <Link
                  href="/settings/api-keys"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-navy-800 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  API Keys
                </Link>
                <Link
                  href="/settings/billing"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-navy-800 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Billing
                </Link>
              </div>
              <div className="border-t border-navy-800 py-1">
                <Link
                  href="/login"
                  className="block px-4 py-2 text-sm text-danger hover:bg-navy-800 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
