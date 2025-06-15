import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Modal content
      </Modal>
    );
    
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Modal content
      </Modal>
    );
    
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("renders with title and description", () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Modal Title"
        description="Modal description text"
      >
        Modal content
      </Modal>
    );
    
    expect(screen.getByText("Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Modal description text")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );
    
    // Click on overlay (background)
    const overlay = screen.getByText("Modal content").closest('[role="dialog"]')?.parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
    }
  });

  it("does not close when closeOnOverlayClick is false", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        Modal content
      </Modal>
    );
    
    const overlay = screen.getByText("Modal content").closest('[role="dialog"]')?.parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).not.toHaveBeenCalled();
    }
  });

  it("renders close button when showCloseButton is true", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} showCloseButton={true}>
        Modal content
      </Modal>
    );
    
    const closeButton = screen.getByLabelText("閉じる");
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not render close button when showCloseButton is false", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
        Modal content
      </Modal>
    );
    
    expect(screen.queryByLabelText("閉じる")).not.toBeInTheDocument();
  });

  it("renders different sizes", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="small">
        Small modal
      </Modal>
    );
    
    let panel = screen.getByText("Small modal").closest('.transform');
    expect(panel).toHaveClass("max-w-md");
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} size="large">
        Large modal
      </Modal>
    );
    
    panel = screen.getByText("Large modal").closest('.transform');
    expect(panel).toHaveClass("max-w-2xl");
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} size="full">
        Full modal
      </Modal>
    );
    
    panel = screen.getByText("Full modal").closest('.transform');
    expect(panel).toHaveClass("max-w-full");
  });

  it("accepts custom className", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} className="custom-modal">
        Modal content
      </Modal>
    );
    
    const panel = screen.getByText("Modal content").closest('.transform');
    expect(panel).toHaveClass("custom-modal");
  });
});