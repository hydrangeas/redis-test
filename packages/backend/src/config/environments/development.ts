export const developmentConfig = {
  // 開発環境固有の設定
  database: {
    logging: true,
    synchronize: true,
  },
  
  cache: {
    ttl: 60, // 1分
    checkPeriod: 120, // 2分
  },
  
  email: {
    transport: 'console', // コンソールに出力
  },
  
  storage: {
    driver: 'local',
    path: './data',
  },
};