import { DomainEvent } from '@/domain/shared/domain-event';

export interface IEventBus {
  /**
   * イベントを発行（遅延ディスパッチ）
   */
  publish(event: DomainEvent): void;
  
  /**
   * 複数のイベントを発行
   */
  publishAll(events: DomainEvent[]): void;
  
  /**
   * イベントハンドラーを登録
   */
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: IEventHandler<T>
  ): void;
  
  /**
   * イベントハンドラーの登録解除
   */
  unsubscribe<T extends DomainEvent>(
    eventName: string,
    handler: IEventHandler<T>
  ): void;
  
  /**
   * 保留中のイベントをディスパッチ
   */
  dispatchPendingEvents(): Promise<void>;
  
  /**
   * 保留中のイベントをクリア（ロールバック時）
   */
  clearPendingEvents(): void;
}

export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}