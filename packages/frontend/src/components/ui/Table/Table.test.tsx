import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from './Table';

describe('Table', () => {
  it('renders table element', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Cell content')).toBeInTheDocument();
  });

  it('wraps table in scrollable container', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const table = screen.getByRole('table');
    const container = table.parentElement;
    expect(container).toHaveClass('overflow-x-auto');
  });

  it('applies bordered styles', () => {
    render(
      <Table bordered>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('border', 'border-gray-200');
  });
});

describe('TableHeader', () => {
  it('renders thead element', () => {
    render(
      <table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Header</TableHeaderCell>
          </TableRow>
        </TableHeader>
      </table>
    );
    
    const thead = document.querySelector('thead');
    expect(thead).toBeInTheDocument();
    expect(thead).toHaveClass('bg-gray-50');
  });
});

describe('TableBody', () => {
  it('renders tbody element', () => {
    render(
      <table>
        <TableBody>
          <TableRow>
            <TableCell>Body</TableCell>
          </TableRow>
        </TableBody>
      </table>
    );
    
    const tbody = document.querySelector('tbody');
    expect(tbody).toBeInTheDocument();
    expect(tbody).toHaveClass('bg-white', 'divide-y', 'divide-gray-200');
  });
});

describe('TableRow', () => {
  it('renders tr element with hover styles', () => {
    render(
      <table>
        <tbody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    
    const row = screen.getByRole('row');
    expect(row).toHaveClass('hover:bg-gray-50', 'transition-colors');
  });
});

describe('TableHeaderCell', () => {
  it('renders th element with correct styles', () => {
    render(
      <table>
        <thead>
          <TableRow>
            <TableHeaderCell>Column Header</TableHeaderCell>
          </TableRow>
        </thead>
      </table>
    );
    
    const th = screen.getByRole('columnheader');
    expect(th).toHaveTextContent('Column Header');
    expect(th).toHaveClass('font-medium', 'text-gray-500', 'uppercase');
  });
});

describe('TableCell', () => {
  it('renders td element with padding', () => {
    render(
      <table>
        <tbody>
          <TableRow>
            <TableCell>Cell Data</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    
    const cell = screen.getByRole('cell');
    expect(cell).toHaveTextContent('Cell Data');
    expect(cell).toHaveClass('px-6', 'py-4');
  });

  it('can span multiple columns', () => {
    render(
      <table>
        <tbody>
          <TableRow>
            <TableCell colSpan={3}>Spanning cell</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    
    const cell = screen.getByRole('cell');
    expect(cell).toHaveAttribute('colspan', '3');
  });
});