import { ApplicationError } from './application-error';

export interface SuccessResult<T> {
  success: true;
  data: T;
  error?: never;
}

export interface ErrorResult {
  success: false;
  data?: never;
  error: ApplicationError;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

export class ApplicationResult {
  static ok<T>(data: T): SuccessResult<T> {
    return {
      success: true,
      data,
    };
  }

  static fail(error: ApplicationError): ErrorResult {
    return {
      success: false,
      error,
    };
  }
}
