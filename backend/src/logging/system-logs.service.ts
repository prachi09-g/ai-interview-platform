import { Injectable } from '@nestjs/common';

export interface SystemLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
}

const MAX_ENTRIES = 200;

/**
 * Holds the most recent MAX_ENTRIES HTTP requests in memory, so
 * GET /admin/logs has something real to show without introducing a Logs
 * table that wasn't part of the Phase 1/3 database design. This is
 * deliberately lightweight: entries are lost on server restart and are
 * not shared across multiple backend instances. A production system would
 * ship these to a real log aggregator (e.g. CloudWatch, Loki) instead —
 * out of scope for a Final Year Major Project's single-instance deployment.
 *
 * Lives in its own global `logging/` module (not inside `admin/`) so that
 * common/interceptors/logging.interceptor.ts — shared infrastructure used
 * by every request — depends on shared infrastructure, not a feature
 * module. AdminModule consumes it the same way any other module would.
 */
@Injectable()
export class SystemLogsService {
  private readonly buffer: SystemLogEntry[] = [];

  record(entry: SystemLogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer.shift();
    }
  }

  findRecent(limit = 100): SystemLogEntry[] {
    return this.buffer.slice(-limit).reverse();
  }
}
