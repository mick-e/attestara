"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Tour step definition for the onboarding tour.
 * Uses CSS selectors to target elements in the dashboard.
 */
interface TourStep {
  selector: string;
  content: string;
  title: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="sidebar"]',
    title: "Navigation",
    content:
      "Use the sidebar to navigate between agents, credentials, sessions, commitments, and analytics.",
  },
  {
    selector: '[data-tour="agents"]',
    title: "Agents",
    content:
      "Register your AI agents here. Each agent gets a DID (Decentralized Identifier) and can participate in negotiations.",
  },
  {
    selector: '[data-tour="credentials"]',
    title: "Credentials",
    content:
      "Issue W3C Verifiable Credentials that define what your agents are authorized to negotiate. Set mandate bounds, domains, and value limits.",
  },
  {
    selector: '[data-tour="sessions"]',
    title: "Sessions",
    content:
      "Create negotiation sessions between agents. Each session tracks proposals, counter-proposals, and ZK proofs.",
  },
  {
    selector: '[data-tour="commitments"]',
    title: "Commitments",
    content:
      "When agents agree on terms, commitments are anchored on-chain (Arbitrum L2) with dual signatures and proof bundles.",
  },
  {
    selector: '[data-tour="analytics"]',
    title: "Analytics",
    content:
      "Monitor your organization's activity: session counts, proof latency, gas spending, and credential usage.",
  },
];

const STORAGE_KEY = "attestara-onboarding-completed";

function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_KEY);
}

function markTourCompleted(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }
}

/**
 * Lightweight onboarding tour component.
 * Shows on first visit to the dashboard. Uses a simple overlay + spotlight
 * approach without heavy dependencies (fallback if @reactour/tour is not installed).
 */
export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show on first visit, with a small delay for the page to render
    const timer = setTimeout(() => {
      if (isFirstVisit()) {
        setIsOpen(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    markTourCompleted();
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    markTourCompleted();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Tour card */}
      <div
        className="fixed left-1/2 top-1/2 z-[9999] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-navy-700 bg-navy-900 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding tour"
      >
        {/* Progress dots */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === currentStep
                    ? "bg-accent"
                    : i < currentStep
                      ? "bg-accent/40"
                      : "bg-navy-700"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-navy-400 transition-colors hover:text-white"
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
        <p className="mb-6 text-sm leading-relaxed text-navy-300">
          {step.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-navy-500">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="rounded-lg border border-navy-700 px-4 py-2 text-sm text-navy-300 transition-colors hover:bg-navy-800 hover:text-white"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Reset the tour so it shows again on next visit.
 * Useful for testing or if the user wants to replay the tour.
 */
export function resetOnboardingTour(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
