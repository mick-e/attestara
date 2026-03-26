import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

describe("LoadingSpinner", () => {
  it("should render without label", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should render with label text", () => {
    render(<LoadingSpinner label="Loading agents..." />);
    expect(screen.getByText("Loading agents...")).toBeInTheDocument();
  });

  it("should not render label when not provided", () => {
    const { container } = render(<LoadingSpinner />);
    const paragraph = container.querySelector("p");
    expect(paragraph).toBeNull();
  });

  it("should apply small size classes", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("h-4");
    expect(spinner?.className).toContain("w-4");
  });

  it("should apply medium size classes by default", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("h-8");
    expect(spinner?.className).toContain("w-8");
  });

  it("should apply large size classes", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("h-12");
    expect(spinner?.className).toContain("w-12");
  });
});
