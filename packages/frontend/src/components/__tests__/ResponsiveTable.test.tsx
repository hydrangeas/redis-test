import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Mock useMediaQuery hook
vi.mock("@/hooks/useMediaQuery");

const mockUseMediaQuery = useMediaQuery as vi.MockedFunction<
  typeof useMediaQuery
>;

interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const testData: TestData[] = [
  { id: "1", name: "Alice", email: "alice@example.com", status: "active" },
  { id: "2", name: "Bob", email: "bob@example.com", status: "inactive" },
  { id: "3", name: "Charlie", email: "charlie@example.com", status: "active" },
];

const columns = [
  { key: "name" as keyof TestData, header: "Name" },
  { key: "email" as keyof TestData, header: "Email" },
  {
    key: "status" as keyof TestData,
    header: "Status",
    render: (value: string) => value.toUpperCase(),
    hideOnMobile: true,
  },
];

describe("ResponsiveTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Desktop View", () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false);
    });

    it("should render as table on desktop", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Check table structure
      expect(screen.getByRole("table")).toBeInTheDocument();

      // Check headers
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();

      // Check data
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      // Multiple ACTIVE status exist, so use getAllByText
      const activeStatuses = screen.getAllByText("ACTIVE");
      expect(activeStatuses.length).toBe(2);
    });

    it("should apply custom render function", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Status should be uppercase due to render function
      const activeStatuses = screen.getAllByText("ACTIVE");
      expect(activeStatuses.length).toBe(2);
      expect(screen.getByText("INACTIVE")).toBeInTheDocument();
    });

    it("should render all columns on desktop", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // All columns including hideOnMobile should be visible
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(3);
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true);
    });

    it("should render as cards on mobile", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Should not render table
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      // Should render card-like structure
      expect(screen.getByText("Name:")).toBeInTheDocument();
      expect(screen.getByText("Email:")).toBeInTheDocument();
      expect(screen.queryByText("Status:")).not.toBeInTheDocument(); // hideOnMobile
    });

    it("should hide columns marked with hideOnMobile", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Status column should be hidden on mobile
      expect(screen.queryByText("Status:")).not.toBeInTheDocument();
      expect(screen.queryByText("ACTIVE")).not.toBeInTheDocument();

      // Other columns should be visible
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("should display data in card format", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Check that data is displayed with labels
      const nameLabels = screen.getAllByText("Name:");
      expect(nameLabels).toHaveLength(3);

      const emailLabels = screen.getAllByText("Email:");
      expect(emailLabels).toHaveLength(3);
    });
  });

  describe("Empty Data", () => {
    it("should handle empty data array", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { container } = render(
        <ResponsiveTable
          data={[]}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Should render table structure but no data rows
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(container.querySelector("tbody")?.children).toHaveLength(0);
    });
  });

  describe("Custom Rendering", () => {
    it("should handle missing render function", () => {
      mockUseMediaQuery.mockReturnValue(false);

      render(
        <ResponsiveTable
          data={testData}
          columns={[
            { key: "name" as keyof TestData, header: "Name" },
            { key: "id" as keyof TestData, header: "ID" },
          ]}
          keyExtractor={(item) => item.id}
        />
      );

      // Should render raw values when no render function provided
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
