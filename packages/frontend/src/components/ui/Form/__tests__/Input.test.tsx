import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "../Input";

describe("Input", () => {
  it("renders with default props", () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("border-gray-300");
  });

  it("renders with label", () => {
    render(<Input label="Username" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("shows required indicator", () => {
    render(<Input label="Email" required />);
    const label = screen.getByText("Email").parentElement;
    expect(label?.textContent).toContain("*");
  });

  it("renders different variants", () => {
    const { rerender } = render(<Input variant="error" />);
    expect(screen.getByRole("textbox")).toHaveClass("border-red-500");

    rerender(<Input variant="success" />);
    expect(screen.getByRole("textbox")).toHaveClass("border-green-500");
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Input size="small" />);
    expect(screen.getByRole("textbox")).toHaveClass("px-2 py-1 text-sm");

    rerender(<Input size="large" />);
    expect(screen.getByRole("textbox")).toHaveClass("px-4 py-3 text-lg");
  });

  it("shows helper text", () => {
    render(<Input helperText="This is helper text" />);
    expect(screen.getByText("This is helper text")).toBeInTheDocument();
  });

  it("shows error state with helper text", () => {
    render(<Input error helperText="Error message" />);
    const input = screen.getByRole("textbox");
    const helperText = screen.getByText("Error message");

    expect(input).toHaveClass("border-red-500");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(helperText).toHaveClass("text-red-600");
  });

  it("handles different input types", () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");

    rerender(<Input type="password" />);
    // Password inputs don't have role="textbox"
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
  });

  it("handles input events", () => {
    const handleChange = vi.fn();
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    render(
      <Input
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "test" } });
    expect(handleChange).toHaveBeenCalled();

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  it("can be disabled", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("generates unique IDs for accessibility", () => {
    render(
      <>
        <Input label="Input 1" helperText="Helper 1" />
        <Input label="Input 2" helperText="Helper 2" />
      </>
    );

    const input1 = screen.getByLabelText("Input 1");
    const input2 = screen.getByLabelText("Input 2");

    expect(input1.id).toBeTruthy();
    expect(input2.id).toBeTruthy();
    expect(input1.id).not.toBe(input2.id);
  });
});
