import type { Meta, StoryObj } from "@storybook/react";
import Spinner, { LoadingOverlay } from "./Spinner";
import { Button } from "../Button";
import { Card, CardContent } from "../Card";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    variant: {
      control: "select",
      options: ["primary", "secondary", "white"],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
    variant: "primary",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <Spinner size="xs" />
        <p className="mt-2 text-sm">XS</p>
      </div>
      <div className="text-center">
        <Spinner size="sm" />
        <p className="mt-2 text-sm">SM</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="mt-2 text-sm">MD</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-2 text-sm">LG</p>
      </div>
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-2 text-sm">XL</p>
      </div>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <Spinner variant="primary" />
        <p className="mt-2 text-sm">Primary</p>
      </div>
      <div className="text-center">
        <Spinner variant="secondary" />
        <p className="mt-2 text-sm">Secondary</p>
      </div>
      <div className="text-center bg-gray-800 p-4 rounded">
        <Spinner variant="white" />
        <p className="mt-2 text-sm text-white">White</p>
      </div>
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <div className="space-y-4">
      <Button disabled>
        <Spinner size="sm" variant="white" className="mr-2" />
        Loading...
      </Button>
      <Button variant="secondary" disabled>
        <Spinner size="sm" className="mr-2" />
        Processing
      </Button>
      <Button variant="outline" disabled>
        <Spinner size="sm" className="mr-2" />
        Please wait
      </Button>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Spinner size="sm" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Loading data...
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Spinner />
        <span className="text-gray-700 dark:text-gray-300">
          Saving changes...
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Spinner size="lg" />
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Uploading files
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This may take a few moments
          </p>
        </div>
      </div>
    </div>
  ),
};

export const LoadingCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <div className="text-center">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Loading your dashboard
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Fetching your latest data...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const OverlayDemo: Story = {
  render: function OverlayDemoComponent() {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleLoad = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 3000);
    };

    return (
      <div className="relative">
        <Card className="w-96">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Content Area</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Click the button below to see the loading overlay in action.
            </p>
            <Button onClick={handleLoad}>Load Data</Button>
          </CardContent>
        </Card>
        <LoadingOverlay show={isLoading} label="Fetching data..." />
      </div>
    );
  },
};

export const FullScreenOverlay: Story = {
  render: function FullScreenOverlayComponent() {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleLoad = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 3000);
    };

    return (
      <div>
        <Button onClick={handleLoad}>Show Full Screen Loading</Button>
        <LoadingOverlay
          show={isLoading}
          fullScreen
          label="Loading application..."
        />
      </div>
    );
  },
};

export const CustomLabel: Story = {
  args: {
    label: "Fetching user data...",
  },
};

export const NoBlurOverlay: Story = {
  render: () => (
    <div className="relative">
      <Card className="w-96">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Content Area</h3>
          <p className="text-gray-600 dark:text-gray-400">
            This overlay doesn&apos;t blur the background.
          </p>
        </CardContent>
      </Card>
      <LoadingOverlay show={true} blur={false} label="Loading without blur" />
    </div>
  ),
};
