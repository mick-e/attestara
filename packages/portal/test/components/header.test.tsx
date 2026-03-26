import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/header";

describe("Header", () => {
  it("should render the organization name", () => {
    render(<Header />);
    expect(screen.getByText("Acme Procurement GmbH")).toBeInTheDocument();
  });

  it("should render the user avatar button", () => {
    render(<Header />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("should render the Connect Wallet button", () => {
    render(<Header />);
    expect(
      screen.getByRole("button", { name: "Connect Wallet" }),
    ).toBeInTheDocument();
  });

  it("should not show user menu by default", () => {
    render(<Header />);
    expect(screen.queryByText("Maria Schmidt")).toBeNull();
  });

  it("should toggle user menu on avatar click", async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Click the avatar button (contains "M")
    await user.click(screen.getByText("M"));
    expect(screen.getByText("Maria Schmidt")).toBeInTheDocument();
    expect(
      screen.getByText("maria@acme-procurement.eu"),
    ).toBeInTheDocument();
  });

  it("should show menu links when open", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByText("M"));
    expect(screen.getByText("Organization Settings")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("should close menu when clicking avatar again", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByText("M"));
    expect(screen.getByText("Maria Schmidt")).toBeInTheDocument();

    await user.click(screen.getByText("M"));
    expect(screen.queryByText("Maria Schmidt")).toBeNull();
  });

  it("should have correct menu link hrefs", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByText("M"));
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/settings");
    expect(hrefs).toContain("/settings/api-keys");
    expect(hrefs).toContain("/settings/billing");
    expect(hrefs).toContain("/login");
  });
});
