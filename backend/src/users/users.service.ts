import { Injectable } from '@nestjs/common';
import { Prisma, RoleName, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;
export type UserWithRoleAndProfile = Prisma.UserGetPayload<{
  include: { role: true; profile: { include: { skills: true } } };
}>;

/**
 * UsersService is the single source of truth for User persistence.
 * AuthService (Phase 4) consumes this rather than querying Prisma directly,
 * so user-lookup/creation logic stays in one place as more modules
 * (Resume, Interview, Analytics, Admin...) need to read/write user data in
 * later phases.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  findByGoogleId(googleId: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: { role: true },
    });
  }

  findById(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  findByIdWithProfile(id: string): Promise<UserWithRoleAndProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true, profile: { include: { skills: true } } },
    });
  }

  /**
   * Creates a new STUDENT user with a required nested Profile
   * (Profile.fullName is non-nullable in the schema, so registration
   * always supplies it). Admin accounts are seeded directly (see
   * prisma/seed.ts), not created through this public-facing path.
   */
  async createStudent(params: {
    email: string;
    fullName: string;
    passwordHash?: string;
    googleId?: string;
    emailVerified?: boolean;
  }): Promise<UserWithRole> {
    const studentRole = await this.prisma.role.upsert({
      where: { name: RoleName.STUDENT },
      update: {},
      create: { name: RoleName.STUDENT },
    });

    return this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
        googleId: params.googleId,
        emailVerified: params.emailVerified ?? false,
        roleId: studentRole.id,
        profile: {
          create: { fullName: params.fullName },
        },
      },
      include: { role: true },
    });
  }

  linkGoogleId(userId: string, googleId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId, emailVerified: true },
    });
  }

  markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Updates the caller's own profile. `skills` (if provided) fully replaces
   * the profile's skill list via `set`, upserting any skill names that
   * don't exist yet in the shared taxonomy — so a student typing a skill
   * not in the Phase 3 seed list still works instead of failing silently.
   */
  async updateProfile(
    userId: string,
    updates: {
      fullName?: string;
      avatarUrl?: string;
      targetRole?: string;
      experienceLevel?: string;
      bio?: string;
      skills?: string[];
    },
  ): Promise<UserWithRoleAndProfile> {
    const { skills, ...profileFields } = updates;

    await this.prisma.profile.update({
      where: { userId },
      data: {
        ...profileFields,
        ...(skills
          ? {
              skills: {
                set: [],
                connectOrCreate: skills.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
            }
          : {}),
      },
    });

    // Non-null assertion is safe: updateProfile is only ever called for an
    // authenticated user, whose Profile is guaranteed to exist (created
    // alongside the User in createStudent/register).
    return (await this.findByIdWithProfile(userId))!;
  }

  /**
   * Soft-deletes the account (isActive = false) rather than a hard delete,
   * preserving referential integrity with the student's interview history,
   * resumes, and achievements for audit/analytics purposes. JwtStrategy
   * already rejects tokens for inactive users on every subsequent request.
   */
  deactivate(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
