import React, { useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      children,
      size = "md",
      closeOnOverlayClick = true,
      closeOnEsc = true,
      className,
    },
    ref
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleEsc = (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === "Escape") {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEsc);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEsc);
        document.body.style.overflow = "";
      };
    }, [isOpen, onClose, closeOnEsc]);

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOverlayClick && event.target === overlayRef.current) {
        onClose();
      }
    };

    if (!isOpen) return null;

    const sizes = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-full mx-4",
    };

    const modalContent = (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={ref}
          className={cn(
            "relative w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl",
            "animate-in zoom-in-95 duration-200",
            sizes[size],
            className
          )}
        >
          {children}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = "Modal";

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, onClose, showCloseButton = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700",
          className
        )}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = "ModalHeader";

export interface ModalTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn(
          "text-xl font-semibold text-gray-900 dark:text-gray-100",
          className
        )}
        {...props}
      >
        {children}
      </h2>
    );
  }
);

ModalTitle.displayName = "ModalTitle";

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-6", className)} {...props}>
        {children}
      </div>
    );
  }
);

ModalBody.displayName = "ModalBody";

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "between";
}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, align = "right", children, ...props }, ref) => {
    const alignments = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center p-6 border-t border-gray-200 dark:border-gray-700 gap-3",
          alignments[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = "ModalFooter";

export default Modal;
