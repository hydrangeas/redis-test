import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ResponsiveGrid } from "@/components/ui/ResponsiveGrid";

describe("ResponsiveGrid", () => {
  it("should render children correctly", () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    );

    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
    expect(container.textContent).toContain("Item 3");
  });

  it("should apply default grid classes", () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Test</div>
      </ResponsiveGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("md:grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-3");
    expect(grid.className).toContain("gap-6");
  });

  it("should apply custom column configuration", () => {
    const { container } = render(
      <ResponsiveGrid cols={{ default: 2, sm: 3, md: 4, lg: 5, xl: 6 }}>
        <div>Test</div>
      </ResponsiveGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("sm:grid-cols-3");
    expect(grid.className).toContain("md:grid-cols-4");
    expect(grid.className).toContain("lg:grid-cols-5");
    expect(grid.className).toContain("xl:grid-cols-6");
  });

  it("should apply custom gap", () => {
    const { container } = render(
      <ResponsiveGrid gap={8}>
        <div>Test</div>
      </ResponsiveGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("gap-8");
  });

  it("should apply additional className", () => {
    const { container } = render(
      <ResponsiveGrid className="custom-class">
        <div>Test</div>
      </ResponsiveGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("custom-class");
  });

  it("should handle partial column configuration", () => {
    const { container } = render(
      <ResponsiveGrid cols={{ default: 1, lg: 4 }}>
        <div>Test</div>
      </ResponsiveGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("lg:grid-cols-4");
    expect(grid.className).not.toContain("sm:grid-cols");
    expect(grid.className).not.toContain("md:grid-cols");
  });
});
