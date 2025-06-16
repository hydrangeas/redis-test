import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "./Alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "error"],
    },
    dismissible: {
      control: "boolean",
    },
    title: {
      control: "text",
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: "info",
    children:
      "This is an informational alert. It provides neutral information to the user.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: "Success! Your changes have been saved.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning: This action cannot be undone.",
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    children: "Error: Unable to process your request. Please try again.",
  },
};

export const WithTitle: Story = {
  args: {
    variant: "info",
    title: "Information",
    children: "This alert has a title for better organization of content.",
  },
};

export const Dismissible: Story = {
  args: {
    variant: "success",
    title: "Success!",
    children: "This alert can be dismissed by clicking the close button.",
    dismissible: true,
    onDismiss: () => {
      // eslint-disable-next-line no-console
      console.log("Alert dismissed");
    },
  },
};

export const LongContent: Story = {
  args: {
    variant: "info",
    title: "System Update",
    children:
      "This is a longer alert message that contains more detailed information. It might include multiple sentences or even paragraphs to convey important information to the user. The alert component should handle long content gracefully.",
  },
};

export const CustomClassName: Story = {
  args: {
    variant: "info",
    children: "This alert has custom styling applied via className.",
    className: "border-2 border-blue-500",
  },
};
