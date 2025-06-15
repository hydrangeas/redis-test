import React from "react";
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
    const { rerender } = render(<Card padding="small">Small padding</Card>);
    expect(screen.getByText("Small padding").parentElement).toHaveClass("p-3");

    rerender(<Card padding="large">Large padding</Card>);
    expect(screen.getByText("Large padding").parentElement).toHaveClass("p-6 md:p-8");
  });

  it("renders with different shadow sizes", () => {
    const { rerender } = render(<Card shadow="small">Small shadow</Card>);
    expect(screen.getByText("Small shadow").parentElement).toHaveClass("shadow-sm");

    rerender(<Card shadow="large">Large shadow</Card>);
    expect(screen.getByText("Large shadow").parentElement).toHaveClass("shadow-lg");
  });

  it("renders with hover effect", () => {
    render(<Card hover>Hoverable card</Card>);
    expect(screen.getByText("Hoverable card").parentElement).toHaveClass(
      "transition-shadow hover:shadow-lg"
    );
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
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content").parentElement).toHaveClass("pt-4");
  });

  it("CardFooter has proper styling", () => {
    render(<CardFooter>Footer</CardFooter>);
    
    const footer = screen.getByText("Footer").parentElement;
    expect(footer).toHaveClass("pt-4 mt-4 border-t border-gray-200");
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

    expect(screen.getByText("Title").closest(".custom-card")).toBeInTheDocument();
    expect(screen.getByText("Title").closest(".custom-header")).toBeInTheDocument();
    expect(screen.getByText("Title")).toHaveClass("custom-title");
    expect(screen.getByText("Desc")).toHaveClass("custom-desc");
    expect(screen.getByText("Content").parentElement).toHaveClass("custom-content");
    expect(screen.getByText("Footer").parentElement).toHaveClass("custom-footer");
  });
});