import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppConfig } from '../config/configuration';

export interface StoredFile {
  /** Public-facing URL/path the frontend uses to reference the file. */
  fileUrl: string;
}

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly s3Configured: boolean;
  private readonly s3Client?: S3Client;

  private readonly endpoint?: string;
  private readonly bucket?: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
  ) {
    const storage = this.configService.get('storage', {
      infer: true,
    });

    this.endpoint = storage.endpoint;
    this.bucket = storage.bucket;
    this.region = storage.region || 'us-east-1';

    this.s3Configured = !!(
      storage.endpoint &&
      storage.bucket &&
      storage.accessKey &&
      storage.secretKey
    );

    if (this.s3Configured) {
      this.s3Client = new S3Client({
        region: this.region,

        endpoint: storage.endpoint,

        credentials: {
          accessKeyId: storage.accessKey!,
          secretAccessKey: storage.secretKey!,
        },

        /**
         * Supabase S3-compatible storage requires
         * path-style addressing.
         */
        forcePathStyle: true,
      });

      this.logger.log(
        `S3-compatible object storage configured for bucket "${storage.bucket}"`,
      );
    } else {
      this.logger.warn(
        'S3 is not configured ' +
          '(S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY) — ' +
          'files will be written to the local uploads/ directory instead.',
      );
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    subfolder: string,
  ): Promise<StoredFile> {
    const ext = path.extname(originalName) || '.bin';

    const key = `${subfolder}/${crypto.randomUUID()}${ext}`;

    if (this.s3Configured && this.s3Client) {
      return this.uploadToS3(buffer, key);
    }

    return this.uploadToLocalDisk(buffer, key);
  }

  private async uploadToLocalDisk(
    buffer: Buffer,
    key: string,
  ): Promise<StoredFile> {
    const fullPath = path.join(
      LOCAL_UPLOADS_DIR,
      key,
    );

    await fs.mkdir(path.dirname(fullPath), {
      recursive: true,
    });

    await fs.writeFile(fullPath, buffer);

    return {
      fileUrl: `/uploads/${key}`,
    };
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
  ): Promise<StoredFile> {
    if (
      !this.s3Client ||
      !this.bucket ||
      !this.endpoint
    ) {
      return this.uploadToLocalDisk(buffer, key);
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: this.getContentType(key),
        }),
      );

      const fileUrl = this.getPublicFileUrl(key);

      return {
        fileUrl,
      };
    } catch (error) {
      this.logger.error(
        `S3 upload failed for key ${key}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }
  }

  /**
   * Converts the Supabase S3 endpoint:
   *
   * https://PROJECT.storage.supabase.co/storage/v1/s3
   *
   * into the public bucket URL:
   *
   * https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/KEY
   */
  private getPublicFileUrl(key: string): string {
    if (!this.endpoint || !this.bucket) {
      return '';
    }

    const endpoint = this.endpoint.replace(/\/+$/, '');

    const supabaseMatch = endpoint.match(
      /^https:\/\/([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3$/,
    );

    if (supabaseMatch) {
      const projectRef = supabaseMatch[1];

      return (
        `https://${projectRef}.supabase.co` +
        `/storage/v1/object/public/` +
        `${this.bucket}/${key}`
      );
    }

    /**
     * Generic S3-compatible fallback.
     */
    return `${endpoint}/${this.bucket}/${key}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    /*
     * Local file
     */
    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace(
        '/uploads/',
        '',
      );

      const fullPath = path.join(
        LOCAL_UPLOADS_DIR,
        relativePath,
      );

      await fs
        .unlink(fullPath)
        .catch(() => undefined);

      return;
    }

    if (
      !this.s3Configured ||
      !this.s3Client ||
      !this.bucket ||
      !this.endpoint
    ) {
      return;
    }

    const key = this.extractObjectKey(fileUrl);

    if (!key) {
      this.logger.warn(
        `Unable to determine object key from URL: ${fileUrl}`,
      );

      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Unable to delete S3 object ${key}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  /**
   * Extract the object key from either:
   *
   * Supabase public URL
   *
   * OR
   *
   * S3-compatible endpoint URL.
   */
  private extractObjectKey(
    fileUrl: string,
  ): string | null {
    if (!this.bucket || !this.endpoint) {
      return null;
    }

    /*
     * Supabase public URL
     */
    const publicMarker =
      `/storage/v1/object/public/${this.bucket}/`;

    const publicIndex =
      fileUrl.indexOf(publicMarker);

    if (publicIndex !== -1) {
      return fileUrl.slice(
        publicIndex + publicMarker.length,
      );
    }

    /*
     * Generic S3 URL
     */
    const baseEndpoint =
      this.endpoint.replace(/\/+$/, '');

    const s3Prefix =
      `${baseEndpoint}/${this.bucket}/`;

    if (fileUrl.startsWith(s3Prefix)) {
      return fileUrl.slice(
        s3Prefix.length,
      );
    }

    return null;
  }

  private getContentType(
    filename: string,
  ): string {
    const ext = path
      .extname(filename)
      .toLowerCase();

    switch (ext) {
      case '.pdf':
        return 'application/pdf';

      case '.doc':
        return 'application/msword';

      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      case '.png':
        return 'image/png';

      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';

      default:
        return 'application/octet-stream';
    }
  }
}