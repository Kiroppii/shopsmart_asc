import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const products = [
  { name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', emoji: '🖱️', price: 650, stock: 12 },
  { name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', emoji: '⌨️', price: 1850, stock: 8 },
  { name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', emoji: '💡', price: 900, stock: 10 },
  { name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', emoji: '📷', price: 1450, stock: 6 },
  { name: 'Laptop Stand', description: 'Foldable aluminum stand for laptops up to 16 inches.', category: 'Study', emoji: '💻', price: 1200, stock: 9 },
  { name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', emoji: '🎧', price: 1350, stock: 7 }
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });
  console.log(`Seeded ${products.length} ShopSmart products.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
