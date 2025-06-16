import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";

describe("Card", () => {
  it("renders children correctly", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Card variant="default">Default</Card>);
    expect(screen.getByText("Default")).toHaveClass("bg-white");

    rerender(<Card variant="bordered">Bordered</Card>);
    expect(screen.getByText("Bordered")).toHaveClass("border");

    rerender(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText("Elevated")).toHaveClass("shadow-lg");
  });

  it("applies padding classes correctly", () => {
    const { rerender } = render(<Card padding="none">No padding</Card>);
    expect(screen.getByText("No padding")).not.toHaveClass("p-3", "p-6", "p-8");

    rerender(<Card padding="sm">Small padding</Card>);
    expect(screen.getByText("Small padding")).toHaveClass("p-3");

    rerender(<Card padding="md">Medium padding</Card>);
    expect(screen.getByText("Medium padding")).toHaveClass("p-6");

    rerender(<Card padding="lg">Large padding</Card>);
    expect(screen.getByText("Large padding")).toHaveClass("p-8");
  });

  it("merges custom className", () => {
    render(<Card className="custom-class">Custom</Card>);
    const card = screen.getByText("Custom");
    expect(card).toHaveClass("custom-class");
    expect(card).toHaveClass("bg-white"); // default variant
  });
});

describe("CardHeader", () => {
  it("renders children correctly", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(<CardHeader action={<button>Action</button>}>Header</CardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders as h3 by default", () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title.tagName).toBe("H3");
  });

  it("renders as specified heading level", () => {
    render(<CardTitle as="h1">Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title.tagName).toBe("H1");
  });

  it("applies correct styles", () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("text-lg", "font-semibold");
  });
});

describe("CardDescription", () => {
  it("renders children correctly", () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });

  it("applies correct styles", () => {
    render(<CardDescription>Description</CardDescription>);
    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-sm", "text-gray-600");
  });
});

describe("CardContent", () => {
  it("renders children correctly", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("renders children correctly", () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("applies alignment classes correctly", () => {
    const { rerender } = render(<CardFooter align="left">Left</CardFooter>);
    expect(screen.getByText("Left")).toHaveClass("justify-start");

    rerender(<CardFooter align="center">Center</CardFooter>);
    expect(screen.getByText("Center")).toHaveClass("justify-center");

    rerender(<CardFooter align="right">Right</CardFooter>);
    expect(screen.getByText("Right")).toHaveClass("justify-end");

    rerender(<CardFooter align="between">Between</CardFooter>);
    expect(screen.getByText("Between")).toHaveClass("justify-between");
  });

  it("has border by default", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toHaveClass("border-t");
  });
});
