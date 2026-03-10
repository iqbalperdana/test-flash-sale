import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';

@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(private dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  async findPendingOrders(userEmail: string, flashSaleId?: number) {
    const query = this.createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'oi')
      .leftJoinAndSelect('oi.item', 'item')
      .where('order.userEmail = :userEmail', { userEmail })
      .andWhere('order.status = :status', { status: 'PENDING' })
      .orderBy('order.createdAt', 'DESC');

    if (flashSaleId) {
      query.andWhere('oi.flashSaleId = :flashSaleId', { flashSaleId });
      return await query.getOne();
    }

    return await query.getMany();
  }

  async getAllOrdersWithDetails() {
    return await this.find({
      order: { createdAt: 'DESC' },
      relations: ['orderItems', 'orderItems.item'],
    });
  }
}
