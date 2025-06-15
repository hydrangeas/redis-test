export const productionConfig = {
  // 本番環境固有の設定
  database: {
    logging: false,
    synchronize: false,
    ssl: true,
  },
  
  cache: {
    ttl: 3600, // 1時間
    checkPeriod: 7200, // 2時間
  },
  
  email: {
    transport: 'ses', // AWS SES
  },
  
  storage: {
    driver: 's3',
    bucket: 'production-data-bucket',
    cdn: 'https://cdn.example.com',
  },
};