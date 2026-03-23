"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { setTokens } from "@/lib/auth";
import { WalletButton } from "@/components/ui/wallet-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{
        access_token: string;
        refresh_token: string;
      }>("/auth/login", { email, password });
      setTokens(res.access_token, res.refresh_token);
      apiClient.setToken(res.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">Sign In</h2>

      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm text-gray-400"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-navy-800" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-navy-800" />
      </div>

      <div className="flex justify-center">
        <WalletButton />
      </div>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent hover:text-accent-hover">
          Sign up
        </Link>
      </p>
    </>
  );
}
