import Redis from 'ioredis';
import { connectionSource } from '../common/configs/database.config';
import { FlashSale } from '../entities/flash-sale.entity';
import { Item } from '../entities/item.entity';

async function seed() {
  const { v4: uuidv4 } = await import('uuid');
  if (!connectionSource.isInitialized) {
    await connectionSource.initialize();
  }

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });

  console.log('Seeding data...');

  const itemRepo = connectionSource.getRepository(Item);
  const flashSaleRepo = connectionSource.getRepository(FlashSale);

  let item = await itemRepo.findOne({ where: { sku: 'iPhone17Pro' } });
  if (!item) {
    item = itemRepo.create({
      name: 'iPhone 17 Pro',
      sku: 'iPhone17Pro',
      description: 'The latest iPhone with Titanium design.',
      price: 399.0,
    });
    item = await itemRepo.save(item);
    console.log('Created item:', item.name);
  }

  const flashSaleName = 'Opening Flash Sale - iPhone 17 Pro';
  let flashSale = await flashSaleRepo.findOne({
    where: { name: flashSaleName },
  });

  if (!flashSale) {
    const now = new Date();
    const endTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    flashSale = flashSaleRepo.create({
      name: flashSaleName,
      item: item,
      startTime: now,
      endTime: endTime,
      allocatedStock: 10,
      availableStock: 10,
      maxPurchaseQty: 1,
      isActive: true,
    });
    flashSale = await flashSaleRepo.save(flashSale);
    console.log('Created flash sale:', flashSale.name);

    // Initialize Redis tokens
    const tokensKey = `flash_sale:${flashSale.id}:tokens`;
    const buyersKey = `flash_sale:${flashSale.id}:buyers`;
    await redis.del(tokensKey, buyersKey);

    const tokens = Array.from({ length: 10 }, () => uuidv4());
    await redis.lpush(tokensKey, ...tokens);
    console.log('Initialized Redis tokens for flash sale ID:', flashSale.id);
  } else {
    // Even if it exists, let's refresh the Redis tokens in case Redis was cleared
    const tokensKey = `flash_sale:${flashSale.id}:tokens`;
    const buyersKey = `flash_sale:${flashSale.id}:buyers`;
    const existingTokens = await redis.llen(tokensKey);
    if (existingTokens === 0) {
      const tokens = Array.from({ length: flashSale.availableStock }, () =>
        uuidv4(),
      );
      if (tokens.length > 0) {
        await redis.lpush(tokensKey, ...tokens);
        console.log('Refreshed Redis tokens for existing flash sale');
      }
    }
    console.log('Flash sale already exists.');
  }

  await connectionSource.destroy();
  redis.quit();
  console.log('Seeding completed!');
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
