import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fscomms.io' },
    update: {},
    create: {
      email: 'admin@fscomms.io',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  // Create staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@fscomms.io' },
    update: {},
    create: {
      email: 'staff@fscomms.io',
      password: staffPassword,
      name: 'Staff User',
      role: 'staff',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('Admin:');
  console.log('  Email: admin@fscomms.io');
  console.log('  Password: admin123');
  console.log('\nStaff:');
  console.log('  Email: staff@fscomms.io');
  console.log('  Password: staff123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
