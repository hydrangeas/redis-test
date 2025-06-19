import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Modal, {
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "./Modal";

describe("Modal", () => {
  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );

    // Since Modal uses createPortal, we need to query from document.body
    const overlay = document.body.querySelector(".bg-black\\/50");
    expect(overlay).toBeTruthy();
    await user.click(overlay!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when modal content is clicked", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );

    await user.click(screen.getByText("Modal content"));

    expect(handleClose).not.toHaveBeenCalled();
  });

  it("does not close on overlay click when closeOnOverlayClick is false", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        <div>Modal content</div>
      </Modal>
    );

    // Since Modal uses createPortal, we need to query from document.body
    const overlay = document.body.querySelector(".bg-black\\/50");
    expect(overlay).toBeTruthy();
    await user.click(overlay!);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it("closes on Escape key press", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );

    await user.keyboard("{Escape}");

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when closeOnEsc is false", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={false}>
        <div>Modal content</div>
      </Modal>
    );

    await user.keyboard("{Escape}");

    expect(handleClose).not.toHaveBeenCalled();
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <div>Content</div>
      </Modal>
    );
    // Since Modal uses createPortal, we need to query from document.body
    const modalContent = document.body.querySelector(".relative.w-full");
    expect(modalContent).toBeTruthy();
    expect(modalContent).toHaveClass("max-w-md");

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <div>Content</div>
      </Modal>
    );
    const modalContentLarge = document.body.querySelector(".relative.w-full");
    expect(modalContentLarge).toBeTruthy();
    expect(modalContentLarge).toHaveClass("max-w-2xl");
  });

  it("sets body overflow hidden when open", () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe("");

    rerender(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("removes body overflow hidden when closed", async () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("");
    });
  });
});

describe("ModalHeader", () => {
  it("renders children and close button", () => {
    const handleClose = vi.fn();
    render(
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Header Title</ModalTitle>
      </ModalHeader>
    );

    expect(screen.getByText("Header Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Header</ModalTitle>
      </ModalHeader>
    );

    await user.click(screen.getByLabelText("Close modal"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not show close button when showCloseButton is false", () => {
    render(
      <ModalHeader onClose={() => {}} showCloseButton={false}>
        <ModalTitle>Header</ModalTitle>
      </ModalHeader>
    );

    expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
  });
});

describe("ModalTitle", () => {
  it("renders as h2 element", () => {
    render(<ModalTitle>Title Text</ModalTitle>);
    const title = screen.getByText("Title Text");
    expect(title.tagName).toBe("H2");
  });

  it("applies correct styles", () => {
    render(<ModalTitle>Title</ModalTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("text-xl", "font-semibold");
  });
});

describe("ModalBody", () => {
  it("renders children with padding", () => {
    render(<ModalBody>Body content</ModalBody>);
    const body = screen.getByText("Body content");
    expect(body).toHaveClass("p-6");
  });
});

describe("ModalFooter", () => {
  it("renders children with correct alignment", () => {
    const { rerender } = render(<ModalFooter align="left">Footer</ModalFooter>);
    expect(screen.getByText("Footer")).toHaveClass("justify-start");

    rerender(<ModalFooter align="center">Footer</ModalFooter>);
    expect(screen.getByText("Footer")).toHaveClass("justify-center");

    rerender(<ModalFooter align="right">Footer</ModalFooter>);
    expect(screen.getByText("Footer")).toHaveClass("justify-end");

    rerender(<ModalFooter align="between">Footer</ModalFooter>);
    expect(screen.getByText("Footer")).toHaveClass("justify-between");
  });

  it("has border and gap by default", () => {
    render(<ModalFooter>Footer</ModalFooter>);
    const footer = screen.getByText("Footer");
    expect(footer).toHaveClass("border-t", "gap-3");
  });
});
