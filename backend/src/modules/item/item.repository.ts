import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Item } from '../../entities/item.entity';

@Injectable()
export class ItemRepository extends Repository<Item> {
  constructor(private dataSource: DataSource) {
    super(Item, dataSource.createEntityManager());
  }

  // Example of custom abstraction if needed
  async getAllItems(): Promise<Item[]> {
    return await this.createQueryBuilder('item').getMany();
  }
}
