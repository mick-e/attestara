"use client";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-gray-400">
          Subscription management and usage tracking
        </p>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-medium text-white">Billing coming soon</h2>
        <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
          Subscription management, usage tracking, and invoicing will be available in an upcoming release.
        </p>
      </div>
    </div>
  );
}
