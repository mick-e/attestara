import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-navy-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            Attest<span className="text-accent">ara</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/docs"
              className="text-sm text-navy-300 transition-colors hover:text-white"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-navy-300 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="text-sm text-navy-300 transition-colors hover:text-white"
            >
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-navy-300 transition-colors hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-950 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-navy-400">
              &copy; {new Date().getFullYear()} Attestara. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/docs"
                className="text-sm text-navy-400 transition-colors hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-navy-400 transition-colors hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="/demo"
                className="text-sm text-navy-400 transition-colors hover:text-white"
              >
                Demo
              </Link>
              <Link
                href="/login"
                className="text-sm text-navy-400 transition-colors hover:text-white"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
