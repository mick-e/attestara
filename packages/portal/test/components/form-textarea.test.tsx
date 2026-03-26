import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { FormTextArea } from "@/components/ui/form-textarea";

describe("FormTextArea", () => {
  it("should render a textarea element", () => {
    render(<FormTextArea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render with a label", () => {
    render(<FormTextArea label="Description" />);
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("should derive id from label", () => {
    render(<FormTextArea label="Commitment Terms" />);
    const textarea = screen.getByLabelText("Commitment Terms");
    expect(textarea.id).toBe("commitment-terms");
  });

  it("should display error message", () => {
    render(
      <FormTextArea label="Policy" error="Policy cannot be empty" />,
    );
    expect(screen.getByText("Policy cannot be empty")).toBeInTheDocument();
  });

  it("should display hint when no error", () => {
    render(
      <FormTextArea label="Notes" hint="Optional additional context" />,
    );
    expect(
      screen.getByText("Optional additional context"),
    ).toBeInTheDocument();
  });

  it("should hide hint when error is shown", () => {
    render(
      <FormTextArea
        label="Notes"
        hint="Optional"
        error="Too long"
      />,
    );
    expect(screen.queryByText("Optional")).toBeNull();
    expect(screen.getByText("Too long")).toBeInTheDocument();
  });

  it("should forward ref to the textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<FormTextArea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("should handle user input", async () => {
    const user = userEvent.setup();
    render(<FormTextArea label="Notes" />);
    const textarea = screen.getByLabelText("Notes");
    await user.type(textarea, "Test description");
    expect(textarea).toHaveValue("Test description");
  });
});
