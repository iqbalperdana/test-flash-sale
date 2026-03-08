import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';

@Injectable()
export class InventoryRepository extends Repository<Inventory> {
  constructor(private dataSource: DataSource) {
    super(Inventory, dataSource.createEntityManager());
  }

  async getAllInventories(): Promise<Inventory[]> {
    return await this.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.item', 'item')
      .getMany();
  }

  async getInventoryById(id: number): Promise<Inventory | null> {
    return await this.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.item', 'item')
      .where('inventory.id = :id', { id })
      .getOne();
  }
}
