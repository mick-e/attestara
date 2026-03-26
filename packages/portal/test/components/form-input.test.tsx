import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { FormInput } from "@/components/ui/form-input";

describe("FormInput", () => {
  it("should render an input element", () => {
    render(<FormInput />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render with a label", () => {
    render(<FormInput label="Agent Name" />);
    expect(screen.getByLabelText("Agent Name")).toBeInTheDocument();
  });

  it("should derive id from label", () => {
    render(<FormInput label="Agent Name" />);
    const input = screen.getByLabelText("Agent Name");
    expect(input.id).toBe("agent-name");
  });

  it("should use explicit id over derived one", () => {
    render(<FormInput label="Agent Name" id="custom-id" />);
    const input = screen.getByLabelText("Agent Name");
    expect(input.id).toBe("custom-id");
  });

  it("should display error message", () => {
    render(<FormInput label="Email" error="Email is required" />);
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("should display hint text when no error", () => {
    render(<FormInput label="DID" hint="Must be a valid DID" />);
    expect(screen.getByText("Must be a valid DID")).toBeInTheDocument();
  });

  it("should hide hint when error is shown", () => {
    render(
      <FormInput label="DID" hint="Must be a valid DID" error="Invalid DID" />,
    );
    expect(screen.queryByText("Must be a valid DID")).toBeNull();
    expect(screen.getByText("Invalid DID")).toBeInTheDocument();
  });

  it("should forward ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<FormInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("should pass through native input props", () => {
    render(
      <FormInput label="Name" placeholder="Enter name" type="email" />,
    );
    const input = screen.getByPlaceholderText("Enter name");
    expect(input).toHaveAttribute("type", "email");
  });

  it("should handle user input", async () => {
    const user = userEvent.setup();
    render(<FormInput label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Test Agent");
    expect(input).toHaveValue("Test Agent");
  });
});
