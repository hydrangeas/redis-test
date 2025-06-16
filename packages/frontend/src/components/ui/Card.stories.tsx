import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Button } from "./Button";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    hover: {
      control: "boolean",
    },
    padding: {
      control: "select",
      options: ["none", "small", "medium", "large"],
    },
    shadow: {
      control: "select",
      options: ["none", "small", "medium", "large"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Basic Card</h3>
        <p className="text-gray-600">
          This is a basic card with default styling.
        </p>
      </div>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the main content area of the card.</p>
        </CardContent>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card with Footer</CardTitle>
          <CardDescription>This card includes a footer section</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content goes here.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-auto">
            Save
          </Button>
        </CardFooter>
      </>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    hover: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Hoverable Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This card has a hover effect. Try hovering over it!</p>
        </CardContent>
      </>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padding: "none",
    children: (
      <div>
        <img
          src="https://via.placeholder.com/400x200"
          alt="Placeholder"
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold">Image Card</h3>
          <p className="text-gray-600 mt-2">
            Card with no padding for image content.
          </p>
        </div>
      </div>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: "small",
    children: "Card with small padding",
  },
};

export const LargePadding: Story = {
  args: {
    padding: "large",
    children: "Card with large padding",
  },
};

export const NoShadow: Story = {
  args: {
    shadow: "none",
    children: "Card with no shadow",
    className: "border border-gray-200",
  },
};

export const LargeShadow: Story = {
  args: {
    shadow: "large",
    children: "Card with large shadow",
  },
};

export const ComplexCard: Story = {
  args: {
    hover: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
          <CardDescription>
            Overview of current project progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="text-gray-600">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: "75%" }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Start Date</p>
                <p className="font-medium">Jan 1, 2025</p>
              </div>
              <div>
                <p className="text-gray-600">Due Date</p>
                <p className="font-medium">Mar 31, 2025</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" size="sm">
            View Details
          </Button>
          <Button size="sm">Update Status</Button>
        </CardFooter>
      </>
    ),
  },
};
