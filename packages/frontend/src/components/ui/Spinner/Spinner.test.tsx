import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner, { LoadingOverlay } from './Spinner';

describe('Spinner', () => {
  it('renders with role status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<Spinner />);
    expect(screen.getByText('Loading...')).toHaveClass('sr-only');
  });

  it('uses custom label', () => {
    render(<Spinner label="Processing..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing...');
    expect(screen.getByText('Processing...')).toHaveClass('sr-only');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Spinner size="xs" />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('w-3', 'h-3');

    rerender(<Spinner size="sm" />);
    expect(svg).toHaveClass('w-4', 'h-4');

    rerender(<Spinner size="md" />);
    expect(svg).toHaveClass('w-6', 'h-6');

    rerender(<Spinner size="lg" />);
    expect(svg).toHaveClass('w-8', 'h-8');

    rerender(<Spinner size="xl" />);
    expect(svg).toHaveClass('w-12', 'h-12');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Spinner variant="primary" />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('text-purple-600');

    rerender(<Spinner variant="secondary" />);
    expect(svg).toHaveClass('text-gray-600');

    rerender(<Spinner variant="white" />);
    expect(svg).toHaveClass('text-white');
  });

  it('has animation class', () => {
    render(<Spinner />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('merges custom className', () => {
    render(<Spinner className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});

describe('LoadingOverlay', () => {
  it('renders when show is true', () => {
    render(<LoadingOverlay show={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<LoadingOverlay show={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows label text', () => {
    render(<LoadingOverlay show={true} label="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(screen.getByText('Please wait...')).not.toHaveClass('sr-only');
  });

  it('applies fullScreen class when fullScreen is true', () => {
    const { container } = render(<LoadingOverlay show={true} fullScreen={true} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('fixed');
  });

  it('applies blur class by default', () => {
    const { container } = render(<LoadingOverlay show={true} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('backdrop-blur-sm');
  });

  it('does not apply blur when blur is false', () => {
    const { container } = render(<LoadingOverlay show={true} blur={false} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).not.toHaveClass('backdrop-blur-sm');
  });

  it('contains a large spinner', () => {
    render(<LoadingOverlay show={true} />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8'); // lg size
  });
});