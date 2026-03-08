import { Injectable, NotFoundException } from '@nestjs/common';
import { Inventory } from '../../entities/inventory.entity';
import { ItemRepository } from '../item/item.repository';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly itemRepository: ItemRepository,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    const item = await this.itemRepository.findOne({
      where: { id: createInventoryDto.itemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Item #${createInventoryDto.itemId} not found`,
      );
    }

    const inventory = this.inventoryRepository.create({
      ...createInventoryDto,
      item,
    });
    return await this.inventoryRepository.save(inventory);
  }

  async findAll(): Promise<Inventory[]> {
    return await this.inventoryRepository.getAllInventories();
  }

  async findOne(id: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.getInventoryById(id);
    if (!inventory) {
      throw new NotFoundException(`Inventory #${id} not found`);
    }
    return inventory;
  }

  async update(
    id: number,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.findOne(id);

    if (updateInventoryDto.itemId) {
      const item = await this.itemRepository.findOne({
        where: { id: updateInventoryDto.itemId },
      });
      if (!item) {
        throw new NotFoundException(
          `Item #${updateInventoryDto.itemId} not found`,
        );
      }
      inventory.item = item;
    }

    const updated = Object.assign(inventory, updateInventoryDto);
    return await this.inventoryRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const inventory = await this.findOne(id);
    await this.inventoryRepository.remove(inventory);
  }
}
