import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring JWT authentication.
 * Read by JwtAuthGuard (wired in Phase 4) to bypass the auth check.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
