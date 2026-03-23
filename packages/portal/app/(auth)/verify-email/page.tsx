"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    apiClient
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified. You can now sign in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Verification failed",
        );
      });
  }, [token]);

  return (
    <div className="text-center">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Email Verification
      </h2>

      {status === "loading" && (
        <p className="text-gray-400">Verifying your email...</p>
      )}

      {status === "success" && (
        <>
          <div className="mb-4 rounded-md border border-verified/20 bg-verified/10 px-4 py-3 text-sm text-verified">
            {message}
          </div>
          <Link
            href="/login"
            className="text-sm text-accent hover:text-accent-hover"
          >
            Go to Sign In
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mb-4 rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {message}
          </div>
          <Link
            href="/login"
            className="text-sm text-accent hover:text-accent-hover"
          >
            Back to Sign In
          </Link>
        </>
      )}
    </div>
  );
}
