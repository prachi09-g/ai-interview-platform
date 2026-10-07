import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Read by RolesGuard.
 * Reuses Prisma's generated RoleName enum (STUDENT/ADMIN) as the single
 * source of truth for role values, instead of a hand-maintained copy that
 * could drift from the database's Role table.
 * Usage: @Roles(RoleName.ADMIN)
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
