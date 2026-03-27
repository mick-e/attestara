import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("should render the title", () => {
    render(<EmptyState title="No agents found" />);
    expect(screen.getByText("No agents found")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(
      <EmptyState
        title="No agents"
        description="Create your first agent to get started."
      />,
    );
    expect(
      screen.getByText("Create your first agent to get started."),
    ).toBeInTheDocument();
  });

  it("should not render description when not provided", () => {
    const { container } = render(<EmptyState title="Empty" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  it("should render the default icon", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText("\u2205")).toBeInTheDocument();
  });

  it("should render a custom icon", () => {
    render(<EmptyState title="Empty" icon="!" />);
    expect(screen.getByText("!")).toBeInTheDocument();
  });

  it("should render the action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: "Create Agent", onClick }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Create Agent" }),
    ).toBeInTheDocument();
  });

  it("should not render the action button when not provided", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("should call onClick when action button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: "Create Agent", onClick }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create Agent" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
