"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { setTokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!orgName || !email || !password) {
      setError("Organization name, email, and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{
        access_token: string;
        refresh_token: string;
      }>("/auth/register", {
        org_name: orgName,
        email,
        password,
        wallet_address: walletAddress || undefined,
      });
      setTokens(res.access_token, res.refresh_token);
      apiClient.setToken(res.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">
        Create Account
      </h2>

      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="orgName"
            className="mb-1 block text-sm text-gray-400"
          >
            Organization Name
          </label>
          <input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            placeholder="Acme Corp"
          />
        </div>

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
            placeholder="Min 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm text-gray-400"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            placeholder="Repeat password"
          />
        </div>

        <div>
          <label
            htmlFor="wallet"
            className="mb-1 block text-sm text-gray-400"
          >
            Wallet Address{" "}
            <span className="text-gray-600">(optional)</span>
          </label>
          <input
            id="wallet"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            placeholder="0x..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover">
          Sign in
        </Link>
      </p>
    </>
  );
}
