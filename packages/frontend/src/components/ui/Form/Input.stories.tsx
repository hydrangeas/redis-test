import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta = {
  title: "UI/Form/Input",
  component: Input,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "error", "success"],
    },
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "url", "search"],
    },
    error: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    required: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Username",
    placeholder: "Enter your username",
  },
};

export const Required: Story = {
  args: {
    label: "Email",
    type: "email",
    placeholder: "your@email.com",
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Password",
    type: "password",
    helperText: "Must be at least 8 characters long",
  },
};

export const ErrorState: Story = {
  args: {
    label: "Email",
    type: "email",
    value: "invalid-email",
    error: true,
    helperText: "Please enter a valid email address",
  },
};

export const SuccessState: Story = {
  args: {
    label: "Username",
    value: "validuser123",
    variant: "success",
    helperText: "Username is available",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Input",
    value: "Cannot edit this",
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    label: "Small Input",
    size: "small",
    placeholder: "Small size",
  },
};

export const Large: Story = {
  args: {
    label: "Large Input",
    size: "large",
    placeholder: "Large size",
  },
};

export const NumberInput: Story = {
  args: {
    label: "Age",
    type: "number",
    min: 0,
    max: 150,
    placeholder: "Enter your age",
  },
};

export const SearchInput: Story = {
  args: {
    type: "search",
    placeholder: "Search...",
    className: "pl-10",
  },
  decorators: [
    (Story) => (
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Story />
      </div>
    ),
  ],
};

export const WithPrefixAndSuffix: Story = {
  args: {
    label: "Price",
    type: "number",
    placeholder: "0.00",
    className: "pl-8 pr-16",
  },
  decorators: [
    (Story) => (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <Story />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">USD</span>
        </div>
      </div>
    ),
  ],
};