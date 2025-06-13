import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('should render heading', () => {
    render(<App />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('オープンデータ提供API');
  });
  
  it('should render status message', () => {
    render(<App />);
    
    const message = screen.getByText('準備中です...');
    expect(message).toBeInTheDocument();
  });
});