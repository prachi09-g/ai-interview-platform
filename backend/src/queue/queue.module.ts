import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { QUEUE_NAMES } from './queue.constants';

/**
 * Global BullMQ setup backed by Redis.
 *
 * Local development:
 * Memurai/Redis on localhost without TLS.
 *
 * Production:
 * Cloud Redis such as Upstash with TLS enabled.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (
        configService: ConfigService<AppConfig, true>,
      ) => {
        const useTls = configService.get('redis.tls', {
          infer: true,
        });

        return {
          connection: {
            host: configService.get('redis.host', {
              infer: true,
            }),

            port: configService.get('redis.port', {
              infer: true,
            }),

            password: configService.get('redis.password', {
              infer: true,
            }),

            ...(useTls ? { tls: {} } : {}),
          },
        };
      },

      inject: [ConfigService],
    }),

    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.RESUME_ANALYSIS,
      },
      {
        name: QUEUE_NAMES.INTERVIEW_EVALUATION,
      },
      {
        name: QUEUE_NAMES.SPEECH_ANALYSIS,
      },
      {
        name: QUEUE_NAMES.CODING_EXECUTION,
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
      },
    ),
  ],

  exports: [BullModule],
})
export class QueueModule {}