// Prepares a fresh LEVIX database: default categories + store settings.
// Products are added by the owner from /admin/products — no fake catalog is seeded.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Overlength T-Shirts', slug: 'overlength-t-shirts', sortOrder: 0 },
  { name: 'Waffle Boxy Fit Full Sleeves', slug: 'waffle-boxy-fit-full-sleeves', sortOrder: 1 },
  { name: 'Acid Wash T-Shirts', slug: 'acid-wash-t-shirts', sortOrder: 2 }
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      announcementText: 'FREE DOMESTIC SHIPPING ON ORDERS ABOVE RS. 1,999 • NEW LEVIX DROPS LIVE • EASY EXCHANGES • ',
      heroHeadline: 'STREETWEAR ARCHITECTURE',
      heroSubtitle: 'Heavyweight Custom-Milled Silhouettes & Limited Private Drops.',
      supportEmail: 'levixfashions@gmail.com'
    }
  });
  console.log('✓ LEVIX database prepared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
