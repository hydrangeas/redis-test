import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useState } from "react";

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
      options: ["small", "medium", "large", "full"],
    },
    closeOnOverlayClick: {
      control: "boolean",
    },
    showCloseButton: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle modal state
const ModalDemo = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const Basic: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: "Basic Modal",
    children: <p>This is a basic modal with default settings.</p>,
  },
};

export const WithDescription: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: "Modal with Description",
    description: "This modal includes a description for additional context",
    children: <p>Main content goes here.</p>,
  },
};

export const Small: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    size: "small",
    title: "Small Modal",
    children: <p>This is a small modal.</p>,
  },
};

export const Large: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    size: "large",
    title: "Large Modal",
    children: (
      <div className="space-y-4">
        <p>This is a large modal with more content.</p>
        <p>It can contain multiple paragraphs and other elements.</p>
        <p>The larger size provides more space for complex content.</p>
      </div>
    ),
  },
};

export const FullWidth: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    size: "full",
    title: "Full Width Modal",
    children: (
      <p>
        This modal takes up the full width of the viewport with some margin.
      </p>
    ),
  },
};

export const NoCloseButton: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    showCloseButton: false,
    title: "Modal without Close Button",
    children: (
      <div>
        <p>This modal doesn't have a close button in the header.</p>
        <p>Users must click outside or use other means to close it.</p>
      </div>
    ),
  },
};

export const NoOverlayClose: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    closeOnOverlayClick: false,
    title: "No Overlay Close",
    description: "Clicking outside won't close this modal",
    children: <p>You must use the close button to dismiss this modal.</p>,
  },
};

export const WithForm: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: "Form Modal",
    children: (
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter your email"
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button>Submit</Button>
        </div>
      </form>
    ),
  },
};

export const LongContent: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: "Terms of Service",
    size: "large",
    children: (
      <div className="prose prose-sm max-w-none">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <h4 className="font-semibold mt-4 mb-2">1. Agreement to Terms</h4>
        <p>
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat.
        </p>
        <h4 className="font-semibold mt-4 mb-2">2. Use License</h4>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>
        <h4 className="font-semibold mt-4 mb-2">3. Disclaimer</h4>
        <p>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum.
        </p>
        <p>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline">Decline</Button>
          <Button>Accept</Button>
        </div>
      </div>
    ),
  },
};
