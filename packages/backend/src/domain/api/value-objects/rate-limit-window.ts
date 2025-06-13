import { ValidationError } from '@/domain/errors/validation-error';

export class RateLimitWindow {
  private readonly _windowSizeSeconds: number;
  private readonly _startTime: Date;
  private readonly _endTime: Date;

  constructor(windowSizeSeconds: number, currentTime: Date = new Date()) {
    if (windowSizeSeconds <= 0) {
      throw new ValidationError('Window size must be positive');
    }

    if (!Number.isInteger(windowSizeSeconds)) {
      throw new ValidationError('Window size must be an integer');
    }

    this._windowSizeSeconds = windowSizeSeconds;
    
    // Calculate window start (aligned to window size)
    const currentMs = currentTime.getTime();
    const windowMs = windowSizeSeconds * 1000;
    const startMs = Math.floor(currentMs / windowMs) * windowMs;
    
    this._startTime = new Date(startMs);
    this._endTime = new Date(startMs + windowMs);
    
    Object.freeze(this);
  }

  get windowSizeSeconds(): number {
    return this._windowSizeSeconds;
  }

  get windowMilliseconds(): number {
    return this._windowSizeSeconds * 1000;
  }

  get startTime(): Date {
    return new Date(this._startTime);
  }

  get endTime(): Date {
    return new Date(this._endTime);
  }

  public contains(timestamp: Date): boolean {
    const time = timestamp.getTime();
    return time >= this._startTime.getTime() && time < this._endTime.getTime();
  }

  public getSecondsUntilExpires(timestamp: Date): number {
    const msUntilExpires = this._endTime.getTime() - timestamp.getTime();
    return Math.ceil(msUntilExpires / 1000);
  }

  public equals(other: RateLimitWindow): boolean {
    if (!other) return false;
    return (
      this._windowSizeSeconds === other._windowSizeSeconds &&
      this._startTime.getTime() === other._startTime.getTime()
    );
  }

  public toString(): string {
    return `Window[${this._startTime.toISOString()}-${this._endTime.toISOString()}]`;
  }
}