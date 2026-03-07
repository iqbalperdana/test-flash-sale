import { Repository, DataSource } from 'typeorm';
import { Item } from '../../common/entities/item.entity';
import { Injectable } from '@nestjs/common';

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
