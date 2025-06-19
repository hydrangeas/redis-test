export interface GuardResult {
  succeeded: boolean;
  message: string;
}

export interface GuardArgument {
  argument: unknown;
  argumentName: string;
}

export class Guard {
  public static combine(guardResults: GuardResult[]): GuardResult {
    for (const result of guardResults) {
      if (!result.succeeded) return result;
    }

    return { succeeded: true, message: '' };
  }

  public static againstNullOrUndefined(argument: unknown, argumentName: string): GuardResult {
    if (argument === null || argument === undefined) {
      return {
        succeeded: false,
        message: `${argumentName} is null or undefined`,
      };
    } else {
      return { succeeded: true, message: '' };
    }
  }

  public static againstNullOrUndefinedBulk(args: GuardArgument[]): GuardResult {
    for (const arg of args) {
      const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
      if (!result.succeeded) return result;
    }

    return { succeeded: true, message: '' };
  }

  public static againstAtLeast(
    numChars: number,
    argument: string,
    argumentName: string,
  ): GuardResult {
    if (argument.length < numChars) {
      return {
        succeeded: false,
        message: `${argumentName} is not at least ${numChars} chars`,
      };
    } else {
      return { succeeded: true, message: '' };
    }
  }

  public static againstAtMost(
    numChars: number,
    argument: string,
    argumentName: string,
  ): GuardResult {
    if (argument.length > numChars) {
      return {
        succeeded: false,
        message: `${argumentName} is greater than ${numChars} chars`,
      };
    } else {
      return { succeeded: true, message: '' };
    }
  }
}
