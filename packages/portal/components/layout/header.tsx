"use client";

import { WalletButton } from "@/components/ui/wallet-button";
import { LiveIndicator } from "@/components/ui/live-indicator";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-navy-800 bg-navy-900 px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-gray-400">Organization</h2>
        <LiveIndicator active />
      </div>

      <div className="flex items-center gap-4">
        <WalletButton />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-accent">
          U
        </div>
      </div>
    </header>
  );
}
