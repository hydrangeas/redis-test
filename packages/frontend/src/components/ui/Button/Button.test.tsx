import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-purple-600");

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gray-200");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("hover:bg-gray-100");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("shows loading state", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
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

  it("applies fullWidth class when fullWidth is true", () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveClass("bg-purple-600"); // default primary variant
  });
});
