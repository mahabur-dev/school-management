import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '../src/generated/prisma/client';
import { bootstrapFeatureConfiguration } from '../src/modules/features/feature-configuration.bootstrap';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const DEMO_PASSWORD = 'DemoPass#123';

async function seedSuperAdmin() {
  const email = (
    process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@example.com'
  ).toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe#12345';

  await prisma.user.upsert({
    where: { email },
    // Re-running the seed never overwrites an existing password.
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, ROUNDS),
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Super admin ready: ${email}`);
}

async function seedDemoSchools() {
  const demos = [
    {
      slug: 'demo-school-a',
      name: 'Demo School A',
      email: 'admin-a@example.com',
    },
    {
      slug: 'demo-school-b',
      name: 'Demo School B',
      email: 'admin-b@example.com',
    },
  ];

  for (const demo of demos) {
    const school = await prisma.school.upsert({
      where: { slug: demo.slug },
      update: {},
      create: { slug: demo.slug, name: demo.name },
    });
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        schoolId: school.id,
        email: demo.email,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, ROUNDS),
        firstName: 'Demo',
        lastName: demo.name,
        role: UserRole.SCHOOL_ADMIN,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(
      `Demo school ready: ${demo.slug} (${demo.email} / ${DEMO_PASSWORD})`,
    );
  }
}

/** Seeds the catalogue and backfills configuration for schools created before it. */
async function seedFeatureConfiguration() {
  const result = await prisma.$transaction((tx) =>
    bootstrapFeatureConfiguration(tx),
  );
  console.log(
    `Feature configuration ready: ${result.fieldCount} fields for ${result.configuredSchoolCount} school(s)`,
  );
}

async function main() {
  await seedSuperAdmin();
  if (process.env.SEED_DEMO_DATA === 'true') await seedDemoSchools();
  await seedFeatureConfiguration();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
