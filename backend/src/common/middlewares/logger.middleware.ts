import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Lightweight request logger applied globally in AppModule.
 * Complements LoggingInterceptor (which times handler execution) by
 * logging the raw incoming request line as soon as it arrives.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Request');

  use(req: Request, _res: Response, next: NextFunction): void {
    this.logger.debug(`--> ${req.method} ${req.originalUrl}`);
    next();
  }
}
