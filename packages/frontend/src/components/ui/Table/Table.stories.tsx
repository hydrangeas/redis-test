import type { Meta, StoryObj } from '@storybook/react';
import Table, {
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './Table';
import { Button } from '../Button';

const meta = {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'striped'],
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const invoices = [
  { id: 'INV001', status: 'Paid', method: 'Credit Card', amount: 250.00 },
  { id: 'INV002', status: 'Pending', method: 'PayPal', amount: 150.00 },
  { id: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: 350.00 },
  { id: 'INV004', status: 'Paid', method: 'Credit Card', amount: 450.00 },
  { id: 'INV005', status: 'Paid', method: 'PayPal', amount: 550.00 },
  { id: 'INV006', status: 'Pending', method: 'Bank Transfer', amount: 200.00 },
  { id: 'INV007', status: 'Unpaid', method: 'Credit Card', amount: 300.00 },
];

export const Default: Story = {
  args: {
    children: (
      <>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.id}</TableCell>
              <TableCell>{invoice.status}</TableCell>
              <TableCell>{invoice.method}</TableCell>
              <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </>
    ),
  },
};

export const Striped: Story = {
  args: {
    variant: 'striped',
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
            <TableCell>Admin</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>jane@example.com</TableCell>
            <TableCell>Editor</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Bob Johnson</TableCell>
            <TableCell>bob@example.com</TableCell>
            <TableCell>Viewer</TableCell>
            <TableCell>Inactive</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Alice Brown</TableCell>
            <TableCell>alice@example.com</TableCell>
            <TableCell>Editor</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};

export const WithActions: Story = {
  args: {
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Fix login bug</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Open
              </span>
            </TableCell>
            <TableCell>High</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost">Edit</Button>
              <Button size="sm" variant="ghost">Delete</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Update documentation</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                In Progress
              </span>
            </TableCell>
            <TableCell>Medium</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost">Edit</Button>
              <Button size="sm" variant="ghost">Delete</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Add new feature</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                Closed
              </span>
            </TableCell>
            <TableCell>Low</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost">Edit</Button>
              <Button size="sm" variant="ghost">Delete</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};

export const Selectable: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<string[]>([]);

    const toggleAll = () => {
      if (selected.length === invoices.length) {
        setSelected([]);
      } else {
        setSelected(invoices.map((i) => i.id));
      }
    };

    const toggleOne = (id: string) => {
      if (selected.includes(id)) {
        setSelected(selected.filter((s) => s !== id));
      } else {
        setSelected([...selected, id]);
      }
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <input
                type="checkbox"
                checked={selected.length === invoices.length}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} data-state={selected.includes(invoice.id) ? 'selected' : undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.includes(invoice.id)}
                  onChange={() => toggleOne(invoice.id)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </TableCell>
              <TableCell className="font-medium">{invoice.id}</TableCell>
              <TableCell>{invoice.status}</TableCell>
              <TableCell>{invoice.method}</TableCell>
              <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const Empty: Story = {
  args: {
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                No results found
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};