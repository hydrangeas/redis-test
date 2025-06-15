import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Alert } from "../Alert";

describe("Alert", () => {
  it("renders with default props", () => {
    render(<Alert>Default alert message</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("bg-blue-50");
    expect(screen.getByText("Default alert message")).toBeInTheDocument();
  });

  it("renders different variants", () => {
    const { rerender } = render(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-green-50");

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-yellow-50");

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50");
  });

  it("renders with title", () => {
    render(<Alert title="Alert Title">Alert content</Alert>);
    expect(screen.getByText("Alert Title")).toBeInTheDocument();
    expect(screen.getByText("Alert content")).toBeInTheDocument();
  });

  it("renders appropriate icons for each variant", () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();

    rerender(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();
  });

  it("renders dismissible alert", () => {
    const handleDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Dismissible alert
      </Alert>
    );

    const closeButton = screen.getByLabelText("閉じる");
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render close button when not dismissible", () => {
    render(<Alert>Non-dismissible alert</Alert>);
    expect(screen.queryByLabelText("閉じる")).not.toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<Alert className="custom-class">Custom alert</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("custom-class");
  });
});