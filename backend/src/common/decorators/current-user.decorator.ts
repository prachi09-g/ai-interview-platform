import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleName;
}

/**
 * Extracts the authenticated user attached to the request by JwtAuthGuard.
 * Usage: @CurrentUser() user: AuthenticatedUser  or  @CurrentUser('id') id: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    return data && user ? user[data] : user;
  },
);
