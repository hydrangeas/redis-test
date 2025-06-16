import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-purple-600");
  });

  it("renders different variants", () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gray-200");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-gray-300");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("renders full width", () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading state", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("renders with icons", () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;

    render(
      <Button leftIcon={leftIcon} rightIcon={rightIcon}>
        With Icons
      </Button>
    );

    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>With Ref</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
