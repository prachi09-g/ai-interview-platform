import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';

import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });

  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('app.port', { infer: true });
  const apiPrefix = configService.get('app.apiPrefix', { infer: true });
  const corsOrigin = configService.get('app.corsOrigin', { infer: true });
  const nodeEnv = configService.get('app.env', { infer: true });

  // ---- Security middleware --------------------------------------------------
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // ---- Global prefix -----------------------------------------------------------
  // API_PREFIX already encodes the version (default "api/v1"), so no separate
  // Nest versioning module is layered on top — that would duplicate the "v1" segment.
  app.setGlobalPrefix(apiPrefix);

  // ---- Static file serving for the local-disk storage fallback -----------------
  // Only relevant when S3 isn't configured — see storage.service.ts. Served
  // OUTSIDE the API prefix (plain /uploads/...) since these are static
  // assets, not API resources.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // ---- Global validation ------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ---- Graceful shutdown for Prisma --------------------------------------------
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  app.enableShutdownHooks();

  // ---- Swagger / OpenAPI documentation -----------------------------------------
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Interview Preparation & Evaluation Platform API')
      .setDescription(
        'REST API for AI-driven mock interviews, speech analysis, resume ATS scoring, ' +
          'coding assessments, and analytics.',
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Auth')
      .addTag('Users')
      .addTag('Resume')
      .addTag('Interview')
      .addTag('Speech Analysis')
      .addTag('Coding Assessment')
      .addTag('Analytics')
      .addTag('Achievements')
      .addTag('Certificates')
      .addTag('Leaderboard')
      .addTag('Notifications')
      .addTag('Feedback')
      .addTag('Admin')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);

  logger.log(`🚀 Application running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
