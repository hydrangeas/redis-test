export { createLogger, createLoggerConfig, createChildLogger, type Logger } from './logger';
export { createFastifyLoggerConfig, setupRequestLogging } from './fastify-logger';
export { logPerformance, measurePerformance, measureSyncPerformance } from './metrics';
// EventLogger is exported separately due to DI dependencies
export type { DomainEvent, IEventHandler } from './event-logger';