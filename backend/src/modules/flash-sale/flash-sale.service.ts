import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

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
    return await this.flashSaleRepository.save(flashSale);
  }

  async findAll(): Promise<FlashSale[]> {
    return await this.flashSaleRepository.getAllFlashSales();
  }

  async findPublic(): Promise<FlashSale[]> {
    const now = new Date();
    return await this.flashSaleRepository
      .createQueryBuilder('flashSale')
      .leftJoinAndSelect('flashSale.item', 'item')
      .where('flashSale.endTime > :now', { now })
      .andWhere('flashSale.isActive = :isActive', { isActive: true })
      .orderBy('flashSale.startTime', 'ASC')
      .getMany();
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
    return await this.flashSaleRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const flashSale = await this.findOne(id);
    await this.flashSaleRepository.remove(flashSale);
  }
}
