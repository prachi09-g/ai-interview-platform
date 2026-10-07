export interface AppConfig {
  app: {
    env: string;
    port: number;
    apiPrefix: string;
    corsOrigin: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    tls: boolean;
  };
  auth: {
    jwtAccessSecret: string;
    jwtAccessExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleCallbackUrl?: string;
    bcryptSaltRounds: number;
    otpExpiryMinutes: number;
  };
  mail: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    from?: string;
  };
  storage: {
    endpoint?: string;
    bucket?: string;
    accessKey?: string;
    secretKey?: string;
    region: string;
  };
  ai: {
    provider: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    whisperApiKey?: string;
    huggingfaceApiKey?: string;
  };
  judge: {
    apiUrl?: string;
    apiKey?: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}

export default (): AppConfig => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },

  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
    bcryptSaltRounds: parseInt(
      process.env.BCRYPT_SALT_ROUNDS ?? '12',
      10,
    ),
    otpExpiryMinutes: parseInt(
      process.env.OTP_EXPIRY_MINUTES ?? '10',
      10,
    ),
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },

  storage: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION ?? 'us-east-1',
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    whisperApiKey: process.env.WHISPER_API_KEY,
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  },

  judge: {
    apiUrl: process.env.JUDGE_API_URL,
    apiKey: process.env.JUDGE_API_KEY,
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});