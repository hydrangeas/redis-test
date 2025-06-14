import { DomainError } from '../errors/domain-error';

export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: Error | string | DomainError;
  private _value?: T;

  private constructor(isSuccess: boolean, error?: Error | string | DomainError, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Can't get the value of an error result. Use 'errorValue' instead.`);
    }

    return this._value as T;
  }

  public getError(): Error | DomainError {
    if (this.isSuccess) {
      throw new Error(`Can't get the error of a success result. Use 'getValue' instead.`);
    }

    if (typeof this.error === 'string') {
      return new Error(this.error);
    }

    return this.error as Error | DomainError;
  }

  /**
   * Maps the value of a successful result to a new value
   */
  public map<U>(fn: (value: T) => U): Result<U> {
    if (!this.isSuccess) {
      return Result.fail<U>(this.error!);
    }
    return Result.ok<U>(fn(this.getValue()));
  }

  /**
   * Maps the error of a failed result to a new error
   */
  public mapError(fn: (error: Error | DomainError) => Error | DomainError | string): Result<T> {
    if (this.isSuccess) {
      return this;
    }
    return Result.fail<T>(fn(this.getError()));
  }

  /**
   * Chains another Result-returning operation
   */
  public flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (!this.isSuccess) {
      return Result.fail<U>(this.error!);
    }
    return fn(this.getValue());
  }

  /**
   * Executes a side effect if the result is successful
   */
  public tap(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this.getValue());
    }
    return this;
  }

  /**
   * Executes a side effect if the result is a failure
   */
  public tapError(fn: (error: Error | DomainError) => void): Result<T> {
    if (this.isFailure) {
      fn(this.getError());
    }
    return this;
  }

  /**
   * Provides a default value if the result is a failure
   */
  public getValueOrDefault(defaultValue: T): T {
    return this.isSuccess ? this.getValue() : defaultValue;
  }

  /**
   * Converts the result to a promise
   */
  public toPromise(): Promise<T> {
    return this.isSuccess 
      ? Promise.resolve(this.getValue())
      : Promise.reject(this.getError());
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: Error | string | DomainError): Result<U> {
    return new Result<U>(false, error);
  }

  public static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok();
  }

  /**
   * Creates a Result from a Promise
   */
  public static async fromPromise<U>(promise: Promise<U>): Promise<Result<U>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * Executes a function and wraps the result
   */
  public static try<U>(fn: () => U): Result<U> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * Executes an async function and wraps the result
   */
  public static async tryAsync<U>(fn: () => Promise<U>): Promise<Result<U>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}