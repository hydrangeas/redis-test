import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Table, {
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
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

  it('applies striped variant', () => {
    render(
      <Table variant="striped">
        <TableBody>
          <TableRow>
            <TableCell>Row 1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Row 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('[&>tbody>tr:nth-child(odd)]:bg-gray-50');
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
    
    const container = screen.getByRole('table').parentElement;
    expect(container).toHaveClass('w-full', 'overflow-auto');
  });
});

describe('TableHeader', () => {
  it('renders thead element', () => {
    render(
      <table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </table>
    );
    
    const thead = document.querySelector('thead');
    expect(thead).toBeInTheDocument();
    expect(thead).toHaveClass('border-b');
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
  });
});

describe('TableFooter', () => {
  it('renders tfoot element with styles', () => {
    render(
      <table>
        <TableFooter>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </table>
    );
    
    const tfoot = document.querySelector('tfoot');
    expect(tfoot).toBeInTheDocument();
    expect(tfoot).toHaveClass('border-t', 'bg-gray-50');
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

  it('applies selected state styles', () => {
    render(
      <table>
        <tbody>
          <TableRow data-state="selected">
            <TableCell>Selected row</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    
    const row = screen.getByRole('row');
    expect(row).toHaveClass('data-[state=selected]:bg-gray-100');
  });
});

describe('TableHead', () => {
  it('renders th element with correct styles', () => {
    render(
      <table>
        <thead>
          <TableRow>
            <TableHead>Column Header</TableHead>
          </TableRow>
        </thead>
      </table>
    );
    
    const th = screen.getByRole('columnheader');
    expect(th).toHaveTextContent('Column Header');
    expect(th).toHaveClass('font-medium', 'text-gray-600');
  });

  it('applies checkbox column styles', () => {
    render(
      <table>
        <thead>
          <TableRow>
            <TableHead>
              <input type="checkbox" role="checkbox" />
            </TableHead>
          </TableRow>
        </thead>
      </table>
    );
    
    const th = screen.getByRole('columnheader');
    expect(th).toHaveClass('[&:has([role=checkbox])]:pr-0');
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
    expect(cell).toHaveClass('p-4');
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

describe('TableCaption', () => {
  it('renders caption element', () => {
    render(
      <Table>
        <TableCaption>Table description</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    const caption = screen.getByText('Table description');
    expect(caption.tagName).toBe('CAPTION');
    expect(caption).toHaveClass('text-sm', 'text-gray-600');
  });
});