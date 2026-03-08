import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FlashSale } from '../../entities/flash-sale.entity';

@Injectable()
export class FlashSaleRepository extends Repository<FlashSale> {
  constructor(private dataSource: DataSource) {
    super(FlashSale, dataSource.createEntityManager());
  }

  async getAllFlashSales(): Promise<FlashSale[]> {
    return await this.createQueryBuilder('flashSale')
      .leftJoinAndSelect('flashSale.item', 'item')
      .getMany();
  }

  async getFlashSaleById(id: number): Promise<FlashSale | null> {
    return await this.createQueryBuilder('flashSale')
      .leftJoinAndSelect('flashSale.item', 'item')
      .where('flashSale.id = :id', { id })
      .getOne();
  }
}
