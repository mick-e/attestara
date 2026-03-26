import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { FormSelect } from "@/components/ui/form-select";

const testOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

describe("FormSelect", () => {
  it("should render a select element", () => {
    render(<FormSelect options={testOptions} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render all options", () => {
    render(<FormSelect options={testOptions} />);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("should render with a label", () => {
    render(<FormSelect label="Provider" options={testOptions} />);
    expect(screen.getByLabelText("Provider")).toBeInTheDocument();
  });

  it("should render a placeholder option", () => {
    render(
      <FormSelect
        options={testOptions}
        placeholder="Select a provider"
      />,
    );
    expect(screen.getByText("Select a provider")).toBeInTheDocument();
  });

  it("should display error message", () => {
    render(
      <FormSelect
        options={testOptions}
        error="Provider is required"
      />,
    );
    expect(screen.getByText("Provider is required")).toBeInTheDocument();
  });

  it("should display hint when no error", () => {
    render(
      <FormSelect
        options={testOptions}
        hint="Choose the AI provider"
      />,
    );
    expect(screen.getByText("Choose the AI provider")).toBeInTheDocument();
  });

  it("should hide hint when error is shown", () => {
    render(
      <FormSelect
        options={testOptions}
        hint="Choose the AI provider"
        error="Required"
      />,
    );
    expect(screen.queryByText("Choose the AI provider")).toBeNull();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("should forward ref to the select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(<FormSelect ref={ref} options={testOptions} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("should allow selecting an option", async () => {
    const user = userEvent.setup();
    render(<FormSelect label="Provider" options={testOptions} />);
    const select = screen.getByLabelText("Provider");
    await user.selectOptions(select, "anthropic");
    expect(select).toHaveValue("anthropic");
  });
});
