import type { Meta, StoryObj } from "@storybook/react";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Button } from "../Button";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "bordered", "elevated"],
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>
            This is a default card with standard styling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const Bordered: Story = {
  args: {
    variant: "bordered",
    children: (
      <>
        <CardHeader>
          <CardTitle>Bordered Card</CardTitle>
          <CardDescription>This card has a border</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            This card variant includes a subtle border for better definition.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: "elevated",
    children: (
      <>
        <CardHeader>
          <CardTitle>Elevated Card</CardTitle>
          <CardDescription>This card has a shadow effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            The elevated variant adds a shadow that increases on hover.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    variant: "bordered",
    children: (
      <>
        <CardHeader>
          <CardTitle>Card with Footer</CardTitle>
          <CardDescription>
            This card includes action buttons in the footer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            Cards can include footers with action buttons for user interactions.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-2">
            Save
          </Button>
        </CardFooter>
      </>
    ),
  },
};

export const WithHeaderAction: Story = {
  args: {
    variant: "elevated",
    children: (
      <>
        <CardHeader
          action={
            <Button variant="ghost" size="sm">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>
          }
        >
          <CardTitle>Card with Header Action</CardTitle>
          <CardDescription>Header can include action buttons</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            The header supports an action slot for additional functionality.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const DifferentPadding: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Card padding="sm">
        <CardTitle>Small Padding</CardTitle>
        <CardDescription>This card has small padding</CardDescription>
      </Card>
      <Card padding="md">
        <CardTitle>Medium Padding</CardTitle>
        <CardDescription>
          This card has medium padding (default)
        </CardDescription>
      </Card>
      <Card padding="lg">
        <CardTitle>Large Padding</CardTitle>
        <CardDescription>This card has large padding</CardDescription>
      </Card>
    </div>
  ),
};

export const ComplexExample: Story = {
  args: {
    variant: "elevated",
    children: (
      <>
        <CardHeader
          action={
            <span className="text-sm text-gray-500 dark:text-gray-400">
              2 hours ago
            </span>
          }
        >
          <CardTitle>Project Update</CardTitle>
          <CardDescription>Latest changes to the design system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                  UI
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  New Components Added
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Button, Card, and Form components
                </p>
              </div>
            </div>
            <div className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Progress
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  75%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: "75%" }}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter align="between">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              12 comments
            </span>
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              234 views
            </span>
          </div>
          <Button size="sm">View Details</Button>
        </CardFooter>
      </>
    ),
  },
};
