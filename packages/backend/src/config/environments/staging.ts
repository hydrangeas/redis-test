export const stagingConfig = {
  // ステージング環境固有の設定
  database: {
    logging: false,
    synchronize: false,
  },
  
  cache: {
    ttl: 300, // 5分
    checkPeriod: 600, // 10分
  },
  
  email: {
    transport: 'smtp',
    host: 'smtp.staging.example.com',
  },
  
  storage: {
    driver: 's3',
    bucket: 'staging-data-bucket',
  },
};