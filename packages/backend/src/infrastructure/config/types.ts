export interface AppConfig {
  environment: string;
  dataPath: string;
  port?: number;
  host?: string;
  rateLimits?: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
}