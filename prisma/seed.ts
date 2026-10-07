import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seeds reference data required for the platform to function end-to-end:
 *  - Roles (STUDENT, ADMIN)
 *  - The 6 interview domains defined in the Phase 1 SRS
 *  - A starter skills taxonomy (used for resume ATS matching in Phase 8)
 *  - Global settings (feature flags / thresholds)
 *  - One seeded admin account so the Admin Dashboard (Phase 7) has a login
 *    from the very first run
 *
 * Idempotent: safe to re-run via `npm run prisma:seed` — every write uses
 * upsert keyed on a unique field.
 */
async function main(): Promise<void> {
  console.log('Seeding roles...');
  const [studentRole, adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.STUDENT },
      update: {},
      create: { name: RoleName.STUDENT },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN },
    }),
  ]);

  console.log('Seeding interview categories...');
  const categories = [
    { name: 'Software Development', description: 'DSA, system design, and language fundamentals', icon: 'code' },
    { name: 'Data Science', description: 'Statistics, ML fundamentals, and case studies', icon: 'bar-chart' },
    { name: 'AI/ML', description: 'Deep learning, NLP, and applied ML engineering', icon: 'cpu' },
    { name: 'Cloud Computing', description: 'AWS/Azure/GCP architecture and DevOps practices', icon: 'cloud' },
    { name: 'Cybersecurity', description: 'AppSec, network security, and incident response', icon: 'shield' },
    { name: 'HR', description: 'Behavioral, situational, and culture-fit interviewing', icon: 'users' },
  ];

  for (const category of categories) {
    await prisma.interviewCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Seeding starter skills taxonomy...');
  const skills = [
    { name: 'JavaScript', category: 'Programming Language' },
    { name: 'TypeScript', category: 'Programming Language' },
    { name: 'Python', category: 'Programming Language' },
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'NestJS', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'System Design', category: 'Core CS' },
    { name: 'Data Structures & Algorithms', category: 'Core CS' },
    { name: 'Machine Learning', category: 'AI/ML' },
    { name: 'Deep Learning', category: 'AI/ML' },
    { name: 'SQL', category: 'Database' },
    { name: 'Git', category: 'Tools' },
    { name: 'REST API Design', category: 'Backend' },
    { name: 'Communication', category: 'Soft Skill' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }

  console.log('Seeding platform settings...');
  const settings = [
    { key: 'MIN_PASSING_SCORE', value: '60' },
    { key: 'OTP_EXPIRY_MINUTES', value: '10' },
    { key: 'MAX_RESUME_SIZE_MB', value: '5' },
    { key: 'DEFAULT_INTERVIEW_QUESTION_COUNT', value: '10' },
    { key: 'LEADERBOARD_REFRESH_CRON', value: '0 * * * *' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Seeding default admin account...');
  const adminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@aiinterview.dev' },
    update: {},
    create: {
      email: 'admin@aiinterview.dev',
      passwordHash: adminPasswordHash,
      emailVerified: true,
      roleId: adminRole.id,
      profile: {
        create: {
          fullName: 'Platform Administrator',
          experienceLevel: 'N/A',
        },
      },
    },
  });

  console.log('✅ Seed complete.');
  console.log(`   Roles: ${studentRole.name}, ${adminRole.name}`);
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Skills: ${skills.length}`);
  console.log('   Admin login: admin@aiinterview.dev / ChangeMe123!  (change immediately)');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
