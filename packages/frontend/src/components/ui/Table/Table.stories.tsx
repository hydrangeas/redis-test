import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "./Table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    striped: {
      control: "boolean",
    },
    hoverable: {
      control: "boolean",
    },
    bordered: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", status: "Inactive" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", role: "Moderator", status: "Active" },
];

export const Basic: Story = {
  args: {
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>
    ),
  },
};

export const Striped: Story = {
  args: {
    striped: true,
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>
    ),
  },
};

export const Bordered: Story = {
  args: {
    bordered: true,
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Stock</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Laptop</TableCell>
            <TableCell>$999</TableCell>
            <TableCell>15</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Mouse</TableCell>
            <TableCell>$29</TableCell>
            <TableCell>50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Keyboard</TableCell>
            <TableCell>$79</TableCell>
            <TableCell>32</TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};

export const WithActions: Story = {
  args: {
    hoverable: true,
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.slice(0, 3).map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>
    ),
  },
};

export const WithStatusBadges: Story = {
  args: {
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Last Active</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <div>
                <div className="font-medium">John Doe</div>
                <div className="text-sm text-gray-500">john@example.com</div>
              </div>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                Admin
              </span>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Active
              </span>
            </TableCell>
            <TableCell className="text-sm text-gray-500">2 hours ago</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <div>
                <div className="font-medium">Jane Smith</div>
                <div className="text-sm text-gray-500">jane@example.com</div>
              </div>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                User
              </span>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Active
              </span>
            </TableCell>
            <TableCell className="text-sm text-gray-500">5 minutes ago</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <div>
                <div className="font-medium">Bob Johnson</div>
                <div className="text-sm text-gray-500">bob@example.com</div>
              </div>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                User
              </span>
            </TableCell>
            <TableCell>
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Inactive
              </span>
            </TableCell>
            <TableCell className="text-sm text-gray-500">3 days ago</TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};

export const Empty: Story = {
  args: {
    children: (
      <>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="text-center py-8">
              <div className="text-gray-500">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">Try adjusting your filters or add new items.</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </>
    ),
  },
};