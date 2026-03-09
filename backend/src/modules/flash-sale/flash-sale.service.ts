import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { FlashSale } from '../../entities/flash-sale.entity';
import { ItemRepository } from '../item/item.repository';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSaleRepository } from './flash-sale.repository';

@Injectable()
export class FlashSaleService {
  constructor(
    private readonly flashSaleRepository: FlashSaleRepository,
    private readonly itemRepository: ItemRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private getTokensKey(id: number) {
    return `flash_sale:${id}:tokens`;
  }

  private getBuyersKey(id: number) {
    return `flash_sale:${id}:buyers`;
  }

  async initializeRedisTokens(id: number, stock: number) {
    const tokensKey = this.getTokensKey(id);
    const buyersKey = this.getBuyersKey(id);

    await this.redis.del(tokensKey, buyersKey);

    if (stock > 0) {
      const tokens = Array.from({ length: stock }, () => uuidv4());

      await this.redis.lpush(tokensKey, ...tokens);
    }
  }

  async create(createFlashSaleDto: CreateFlashSaleDto): Promise<FlashSale> {
    const item = await this.itemRepository.findOne({
      where: { id: createFlashSaleDto.itemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Item #${createFlashSaleDto.itemId} not found`,
      );
    }

    const flashSale = this.flashSaleRepository.create({
      ...createFlashSaleDto,
      item,
    });
    const saved = await this.flashSaleRepository.save(flashSale);

    await this.initializeRedisTokens(saved.id, saved.availableStock);

    return saved;
  }

  async findAll(): Promise<FlashSale[]> {
    return await this.flashSaleRepository.getAllFlashSales();
  }

  async findPublic(): Promise<FlashSale[]> {
    return await this.flashSaleRepository.getActiveAndUpcomingFlashSales();
  }

  async findOne(id: number): Promise<FlashSale> {
    const flashSale = await this.flashSaleRepository.getFlashSaleById(id);
    if (!flashSale) {
      throw new NotFoundException(`FlashSale #${id} not found`);
    }
    return flashSale;
  }

  async update(
    id: number,
    updateFlashSaleDto: UpdateFlashSaleDto,
  ): Promise<FlashSale> {
    const flashSale = await this.findOne(id);

    if (updateFlashSaleDto.itemId) {
      const item = await this.itemRepository.findOne({
        where: { id: updateFlashSaleDto.itemId },
      });
      if (!item) {
        throw new NotFoundException(
          `Item #${updateFlashSaleDto.itemId} not found`,
        );
      }
      flashSale.item = item;
    }

    const updated = Object.assign(flashSale, updateFlashSaleDto);
    const saved = await this.flashSaleRepository.save(updated);

    if (
      updateFlashSaleDto.availableStock !== undefined ||
      updateFlashSaleDto.isActive === true
    ) {
      await this.initializeRedisTokens(saved.id, saved.availableStock);
    }

    return saved;
  }

  async remove(id: number): Promise<void> {
    const flashSale = await this.findOne(id);
    await this.flashSaleRepository.remove(flashSale);
    await this.redis.del(this.getTokensKey(id), this.getBuyersKey(id));
  }
}
