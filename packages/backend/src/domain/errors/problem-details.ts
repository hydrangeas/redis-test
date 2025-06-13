/**
 * RFC 7807 Problem Details for HTTP APIs
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /**
   * A URI reference that identifies the problem type.
   * When dereferenced, it should provide human-readable documentation.
   */
  type: string;

  /**
   * A short, human-readable summary of the problem type.
   * It should not change from occurrence to occurrence of the problem.
   */
  title: string;

  /**
   * The HTTP status code.
   */
  status: number;

  /**
   * A human-readable explanation specific to this occurrence of the problem.
   */
  detail?: string;

  /**
   * A URI reference that identifies the specific occurrence of the problem.
   * It may or may not yield further information if dereferenced.
   */
  instance?: string;

  /**
   * Extension members.
   * Problem type definitions may extend the problem details object
   * with additional members.
   */
  [key: string]: any;
}

/**
 * Factory function to create a ProblemDetails object
 */
export function createProblemDetails(
  type: string,
  title: string,
  status: number,
  detail?: string,
  instance?: string,
  extensions?: Record<string, any>
): ProblemDetails {
  return {
    type,
    title,
    status,
    ...(detail && { detail }),
    ...(instance && { instance }),
    ...extensions,
  };
}