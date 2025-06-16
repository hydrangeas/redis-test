import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Alert, { AlertTitle, AlertDescription } from "./Alert";

describe("Alert", () => {
  it("renders children correctly", () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Alert message");
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Alert variant="default">Default</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-gray-100");

    rerender(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-blue-50");

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-green-50");

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-yellow-50");

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50");
  });

  it("shows default icon for each variant", () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();
  });

  it("does not show icon for default variant", () => {
    render(<Alert variant="default">Default</Alert>);
    expect(
      screen.getByRole("alert").querySelector("svg")
    ).not.toBeInTheDocument();
  });

  it("shows custom icon when provided", () => {
    const customIcon = <span data-testid="custom-icon">⚡</span>;
    render(<Alert icon={customIcon}>Custom icon</Alert>);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("hides icon when icon is null", () => {
    render(
      <Alert variant="info" icon={null}>
        No icon
      </Alert>
    );
    expect(
      screen.getByRole("alert").querySelector("svg")
    ).not.toBeInTheDocument();
  });

  it("shows close button when onClose is provided", () => {
    render(<Alert onClose={() => {}}>Dismissible</Alert>);
    expect(screen.getByLabelText("Close alert")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<Alert onClose={handleClose}>Dismissible</Alert>);
    await user.click(screen.getByLabelText("Close alert"));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not show close button when onClose is not provided", () => {
    render(<Alert>Not dismissible</Alert>);
    expect(screen.queryByLabelText("Close alert")).not.toBeInTheDocument();
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Alert ref={ref}>Alert</Alert>);
    expect(ref).toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(<Alert className="custom-class">Custom</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("custom-class");
    expect(alert).toHaveClass("relative"); // default class
  });
});

describe("AlertTitle", () => {
  it("renders as h5 element", () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByText("Title");
    expect(title.tagName).toBe("H5");
  });

  it("applies correct styles", () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("font-medium", "mb-1");
  });
});

describe("AlertDescription", () => {
  it("renders as p element", () => {
    render(<AlertDescription>Description</AlertDescription>);
    const description = screen.getByText("Description");
    expect(description.tagName).toBe("P");
  });

  it("applies correct styles", () => {
    render(<AlertDescription>Description</AlertDescription>);
    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-sm", "opacity-90");
  });
});
