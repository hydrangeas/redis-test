import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@/components/icons";
import { cn } from "@/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large" | "full";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-2xl",
  full: "max-w-full mx-4",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "medium",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        {/* オーバーレイ */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all",
                  sizeClasses[size],
                  className
                )}
              >
                {/* ヘッダー */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-medium leading-6 text-gray-900"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-gray-500">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>

                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="ml-auto -mr-2 -mt-2 p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
                        aria-label="閉じる"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* コンテンツ */}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
