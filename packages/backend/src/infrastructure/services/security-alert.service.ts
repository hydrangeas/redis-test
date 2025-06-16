export interface SecurityAlert {
  type: 'SUSPICIOUS_TOKEN_REFRESH' | 'BRUTE_FORCE_ATTEMPT' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress?: string;
  details: Record<string, any>;
  message: string;
}

export interface ISecurityAlertService {
  sendAlert(alert: SecurityAlert): Promise<void>;
}
