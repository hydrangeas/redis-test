import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { CheckCircleIcon, XIcon } from "../icons";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "outline",
        "ghost",
        "danger",
        "success",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "icon"],
    },
    fullWidth: {
      control: "boolean",
    },
    loading: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Danger: Story = {
  args: {
    children: "Danger Button",
    variant: "danger",
  },
};

export const Success: Story = {
  args: {
    children: "Success Button",
    variant: "success",
  },
};

export const Link: Story = {
  args: {
    children: "Link Button",
    variant: "link",
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
  },
};

export const ExtraLarge: Story = {
  args: {
    children: "Extra Large Button",
    size: "xl",
  },
};

export const IconButton: Story = {
  args: {
    children: <XIcon className="h-5 w-5" />,
    size: "icon",
    variant: "outline",
  },
};

export const Loading: Story = {
  args: {
    children: "Submit",
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: "Full Width Button",
    fullWidth: true,
  },
};

export const WithLeftIcon: Story = {
  args: {
    children: "Save",
    leftIcon: <CheckCircleIcon className="h-5 w-5" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: "Next",
    rightIcon: <span>→</span>,
  },
};

export const WithBothIcons: Story = {
  args: {
    children: "Process",
    leftIcon: <span>⚡</span>,
    rightIcon: <span>→</span>,
  },
};
