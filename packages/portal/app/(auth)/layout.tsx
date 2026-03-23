export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Agent<span className="text-accent">Clear</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Cryptographic Trust for AI Agents
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-navy-800 bg-navy-900 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
