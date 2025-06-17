import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import Modal, {
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "./Modal";
import { Button } from "../Button";
import { Input } from "../Input";
import type { StoryContext } from "@/test/types";

const meta = {
  title: "UI/Modal",
  component: Modal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "full"],
    },
    closeOnOverlayClick: {
      control: "boolean",
    },
    closeOnEsc: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

const ModalDemo = (args: StoryContext["args"]) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader onClose={() => setIsOpen(false)}>
          <ModalTitle>Modal Title</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            This is a modal dialog. You can put any content here.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsOpen(false)}>Confirm</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    size: "md",
  },
};

export const Small: Story = {
  render: function SmallModal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Small Modal</Button>
        <Modal size="sm" isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalHeader onClose={() => setIsOpen(false)}>
            <ModalTitle>Small Modal</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-400">
              This is a small modal, perfect for confirmations.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => setIsOpen(false)}>
              Confirm
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const Large: Story = {
  render: function LargeModal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Large Modal</Button>
        <Modal size="lg" isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalHeader onClose={() => setIsOpen(false)}>
            <ModalTitle>Large Modal</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                This is a large modal with more content space.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>Confirm</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const WithForm: Story = {
  render: function WithFormModal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <ModalHeader onClose={() => setIsOpen(false)}>
            <ModalTitle>Create New Account</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <form className="space-y-4">
              <Input label="Name" placeholder="Enter your name" required />
              <Input
                label="Email"
                type="email"
                placeholder="email@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
              />
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>Create Account</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const NoOverlayClose: Story = {
  render: function NoOverlayCloseModal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>
          Open Modal (No Overlay Close)
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          closeOnOverlayClick={false}
          closeOnEsc={false}
        >
          <ModalHeader onClose={() => setIsOpen(false)}>
            <ModalTitle>Important Action</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-400">
              This modal cannot be closed by clicking the overlay or pressing
              Escape. You must use the buttons to close it.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setIsOpen(false)}>
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};

export const CustomContent: Story = {
  render: function CustomContentModal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Custom Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="relative h-48 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-200"
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
            <div className="absolute bottom-4 left-6">
              <h2 className="text-2xl font-bold text-white">Welcome!</h2>
              <p className="text-white/80">Thanks for joining our community</p>
            </div>
          </div>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                We&apos;re excited to have you here. Check out these resources to get
                started:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Complete your profile
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Read the documentation
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 mr-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Join our Discord server
                </li>
              </ul>
            </div>
          </ModalBody>
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Skip for now
            </Button>
            <Button onClick={() => setIsOpen(false)}>Get Started</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};
