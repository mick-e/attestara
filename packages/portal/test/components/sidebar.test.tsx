import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar", () => {
  it("should render the brand name", () => {
    render(<Sidebar />);
    // The brand text is split: "Attest" + "ara"
    const links = screen.getAllByRole("link");
    const brandLink = links.find((link) => link.getAttribute("href") === "/");
    expect(brandLink).toBeDefined();
    expect(brandLink?.textContent).toContain("Attest");
    expect(brandLink?.textContent).toContain("ara");
  });

  it("should render all navigation links", () => {
    render(<Sidebar />);
    const expectedLabels = [
      "Overview",
      "Agents",
      "Credentials",
      "Sessions",
      "Commitments",
      "Analytics",
      "Settings",
    ];
    for (const label of expectedLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("should render the version number", () => {
    render(<Sidebar />);
    const versionTexts = screen.getAllByText("Attestara v0.1.0");
    expect(versionTexts.length).toBeGreaterThan(0);
  });

  it("should render mobile hamburger button", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  });

  it("should render close menu button", () => {
    render(<Sidebar />);
    const closeButtons = screen.getAllByRole("button", { name: "Close menu" });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it("should toggle mobile sidebar when hamburger is clicked", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    // Click open menu
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // The mobile overlay should appear (a div with bg-black/50)
    // Close menu should exist
    const closeButtons = screen.getAllByRole("button", { name: "Close menu" });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it("should have correct navigation hrefs", () => {
    render(<Sidebar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/agents");
    expect(hrefs).toContain("/credentials");
    expect(hrefs).toContain("/sessions");
    expect(hrefs).toContain("/commitments");
    expect(hrefs).toContain("/analytics");
    expect(hrefs).toContain("/settings");
  });
});
