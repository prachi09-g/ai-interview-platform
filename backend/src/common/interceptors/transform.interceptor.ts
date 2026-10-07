import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  message: string;
  timestamp: string;
}

/**
 * Wraps every successful controller response in a consistent
 * { success, statusCode, data, message, timestamp } envelope.
 * Controllers may optionally return { data, message } to customize
 * the message; otherwise a sensible default is used.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();

    return next.handle().pipe(
      map((result) => {
        const statusCode = response.statusCode;
        const hasCustomShape =
          result && typeof result === 'object' && 'data' in result && 'message' in result;

        return {
          success: true,
          statusCode,
          data: hasCustomShape ? result.data : result,
          message: hasCustomShape ? result.message : 'Request successful',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
