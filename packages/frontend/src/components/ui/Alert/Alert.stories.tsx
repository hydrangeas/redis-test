import type { Meta, StoryObj } from '@storybook/react';
import Alert, { AlertTitle, AlertDescription } from './Alert';
import { useState } from 'react';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'info', 'success', 'warning', 'error'],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a default alert message.',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'This is an informational alert.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Operation completed successfully!',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Please review before proceeding.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'An error occurred. Please try again.',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'info',
    children: (
      <>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components and dependencies to your app using the cli.
        </AlertDescription>
      </>
    ),
  },
};

export const Dismissible: Story = {
  render: () => {
    const [showAlert, setShowAlert] = useState(true);

    if (!showAlert) {
      return (
        <button
          onClick={() => setShowAlert(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Show Alert
        </button>
      );
    }

    return (
      <Alert
        variant="warning"
        onClose={() => setShowAlert(false)}
      >
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          This alert can be dismissed by clicking the close button.
        </AlertDescription>
      </Alert>
    );
  },
};

export const CustomIcon: Story = {
  args: {
    variant: 'info',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    children: 'Alert with a custom icon.',
  },
};

export const NoIcon: Story = {
  args: {
    variant: 'info',
    icon: null,
    children: 'This alert has no icon.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>This is a default alert with neutral styling.</AlertDescription>
      </Alert>
      
      <Alert variant="info">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>This alert provides helpful information to the user.</AlertDescription>
      </Alert>
      
      <Alert variant="success">
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>Your changes have been saved successfully.</AlertDescription>
      </Alert>
      
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please be careful with this action.</AlertDescription>
      </Alert>
      
      <Alert variant="error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong. Please try again later.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    variant: 'info',
    children: (
      <>
        <AlertTitle>System Maintenance Notice</AlertTitle>
        <AlertDescription>
          We will be performing scheduled maintenance on our systems from 2:00 AM to 4:00 AM EST on Saturday, January 28th. 
          During this time, some services may be temporarily unavailable. We apologize for any inconvenience this may cause 
          and appreciate your patience. If you have any urgent matters, please contact our support team at support@example.com.
        </AlertDescription>
      </>
    ),
  },
};