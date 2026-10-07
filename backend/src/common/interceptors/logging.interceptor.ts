import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SystemLogsService } from '../../logging/system-logs.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly systemLogsService: SystemLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const { method, originalUrl, ip } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} +${duration}ms - ${ip}`,
          );
          this.systemLogsService.record({
            timestamp: new Date().toISOString(),
            method,
            path: originalUrl,
            statusCode: response.statusCode,
            durationMs: duration,
            ip,
          });
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${originalUrl} FAILED +${duration}ms - ${err?.message ?? 'Unknown error'}`,
          );
          this.systemLogsService.record({
            timestamp: new Date().toISOString(),
            method,
            path: originalUrl,
            statusCode: err?.status ?? 500,
            durationMs: duration,
            ip,
          });
        },
      }),
    );
  }
}
