import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState", () => {
  it("should render the default title", () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should render a custom title", () => {
    render(<ErrorState title="Not Found" message="Agent not found" />);
    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });

  it("should render the error message", () => {
    render(<ErrorState message="Failed to load credentials" />);
    expect(
      screen.getByText("Failed to load credentials"),
    ).toBeInTheDocument();
  });

  it("should render the warning icon", () => {
    render(<ErrorState message="Error" />);
    expect(screen.getByText("\u26A0")).toBeInTheDocument();
  });

  it("should render retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  });

  it("should not render retry button when onRetry is not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
