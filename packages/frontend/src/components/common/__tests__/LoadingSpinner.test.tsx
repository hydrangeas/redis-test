import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render loading spinner container", () => {
    const { container } = render(<LoadingSpinner />);

    const spinnerContainer = container.querySelector(
      ".loading-spinner-container"
    );
    expect(spinnerContainer).toBeInTheDocument();
  });

  it("should render loading spinner element", () => {
    const { container } = render(<LoadingSpinner />);

    const spinner = container.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
  });

  it("should render four spinner rings", () => {
    const { container } = render(<LoadingSpinner />);

    const spinnerRings = container.querySelectorAll(".spinner-ring");
    expect(spinnerRings).toHaveLength(4);
  });

  it("should have correct DOM structure", () => {
    const { container } = render(<LoadingSpinner />);

    const spinnerContainer = container.querySelector(
      ".loading-spinner-container"
    );
    const spinner = spinnerContainer?.querySelector(".loading-spinner");
    const rings = spinner?.querySelectorAll(".spinner-ring");

    expect(spinnerContainer).toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
    expect(rings).toHaveLength(4);
  });

  it("should render consistently", () => {
    const { container: container1 } = render(<LoadingSpinner />);
    const { container: container2 } = render(<LoadingSpinner />);

    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
});
