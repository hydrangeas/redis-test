import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../Card";

describe("Card", () => {
  it("renders basic card", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders with different padding sizes", () => {
    const { rerender, container } = render(<Card padding="small">Small padding</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("p-3");

    rerender(<Card padding="large">Large padding</Card>);
    const largeCard = container.firstChild as HTMLElement;
    expect(largeCard).toHaveClass("p-6", "md:p-8");
  });

  it("renders with different shadow sizes", () => {
    const { rerender, container } = render(<Card shadow="small">Small shadow</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("shadow-sm");

    rerender(<Card shadow="large">Large shadow</Card>);
    const largeCard = container.firstChild as HTMLElement;
    expect(largeCard).toHaveClass("shadow-lg");
  });

  it("renders with hover effect", () => {
    const { container } = render(<Card hover>Hoverable card</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("transition-shadow", "hover:shadow-lg");
  });

  it("renders complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description text")).toBeInTheDocument();
    expect(screen.getByText("Main content area")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("CardHeader has proper styling", () => {
    render(
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
    );

    const header = screen.getByText("Title").parentElement;
    expect(header).toHaveClass("pb-4 border-b border-gray-200");
  });

  it("CardTitle renders as h3 with proper styling", () => {
    render(<CardTitle>Title Text</CardTitle>);

    const title = screen.getByText("Title Text");
    expect(title.tagName).toBe("H3");
    expect(title).toHaveClass("text-lg font-semibold text-gray-900");
  });

  it("CardDescription renders as paragraph with proper styling", () => {
    render(<CardDescription>Description text</CardDescription>);

    const description = screen.getByText("Description text");
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("mt-1 text-sm text-gray-600");
  });

  it("CardContent has proper spacing", () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass("pt-4");
  });

  it("CardFooter has proper styling", () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass("pt-4", "mt-4", "border-t", "border-gray-200");
  });

  it("accepts custom className on all components", () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Title</CardTitle>
          <CardDescription className="custom-desc">Desc</CardDescription>
        </CardHeader>
        <CardContent className="custom-content">Content</CardContent>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    );

    expect(
      screen.getByText("Title").closest(".custom-card")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Title").closest(".custom-header")
    ).toBeInTheDocument();
    expect(screen.getByText("Title")).toHaveClass("custom-title");
    expect(screen.getByText("Desc")).toHaveClass("custom-desc");
    // Find the CardContent by looking for the element with both pt-4 and custom-content classes
    const contentElement = screen.getByText("Content").closest(".custom-content");
    expect(contentElement).toBeInTheDocument();
    
    // Find the CardFooter by looking for the element with custom-footer class
    const footerElement = screen.getByText("Footer").closest(".custom-footer");
    expect(footerElement).toBeInTheDocument();
  });
});
