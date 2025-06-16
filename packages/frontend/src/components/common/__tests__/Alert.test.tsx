import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "../Alert";

describe("Alert", () => {
  it("should render error alert with correct styling", () => {
    render(<Alert type="error">This is an error message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("alert", "alert-error");
    expect(screen.getByText("This is an error message")).toBeInTheDocument();
  });

  it("should render warning alert with correct styling", () => {
    render(<Alert type="warning">This is a warning message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("alert", "alert-warning");
    expect(screen.getByText("This is a warning message")).toBeInTheDocument();
  });

  it("should render info alert with correct styling", () => {
    render(<Alert type="info">This is an info message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("alert", "alert-info");
    expect(screen.getByText("This is an info message")).toBeInTheDocument();
  });

  it("should render success alert with correct styling", () => {
    render(<Alert type="success">This is a success message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("alert", "alert-success");
    expect(screen.getByText("This is a success message")).toBeInTheDocument();
  });

  it("should render close button when onClose is provided", () => {
    const onClose = vi.fn();
    render(
      <Alert type="info" onClose={onClose}>
        Alert with close button
      </Alert>
    );

    const closeButton = screen.getByLabelText("Close alert");
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent("×");
  });

  it("should not render close button when onClose is not provided", () => {
    render(<Alert type="info">Alert without close button</Alert>);

    const closeButton = screen.queryByLabelText("Close alert");
    expect(closeButton).not.toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Alert type="error" onClose={onClose}>
        Closable alert
      </Alert>
    );

    const closeButton = screen.getByLabelText("Close alert");
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render complex children content", () => {
    render(
      <Alert type="info">
        <strong>Important:</strong>
        <span> This is a complex message with </span>
        <a href="/link">a link</a>
      </Alert>
    );

    expect(screen.getByText("Important:")).toBeInTheDocument();
    expect(
      screen.getByText(/This is a complex message with/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "a link" })).toBeInTheDocument();
  });

  it("should have proper ARIA role", () => {
    render(<Alert type="error">Accessible alert</Alert>);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should have alert-content wrapper", () => {
    const { container } = render(<Alert type="info">Alert content</Alert>);

    const contentWrapper = container.querySelector(".alert-content");
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveTextContent("Alert content");
  });
});
