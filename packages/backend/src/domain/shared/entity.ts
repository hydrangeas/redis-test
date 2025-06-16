import { v4 as uuidv4 } from 'uuid';

const isEntity = (v: any): v is Entity<any> => {
  return v instanceof Entity;
};

export abstract class Entity<T> {
  protected readonly _id: UniqueEntityId;
  protected props: T;

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id ? id : new UniqueEntityId();
    this.props = props;
    // Use defineProperty to make props non-configurable but still writable internally
    Object.defineProperty(this, 'props', {
      value: this.props,
      writable: true,
      enumerable: false,
      configurable: false,
    });
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!isEntity(object)) {
      return false;
    }

    return this._id.equals(object._id);
  }
}

export class UniqueEntityId {
  private _value: string;

  constructor(id?: string) {
    this._value = id ? id : uuidv4();
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  equals(id?: UniqueEntityId): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof this.constructor)) {
      return false;
    }
    return id.toValue() === this._value;
  }

  toString(): string {
    return String(this._value);
  }

  toValue(): string {
    return this._value;
  }

  hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this._value.length; i++) {
      const char = this._value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
