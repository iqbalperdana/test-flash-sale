import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { FlashSale } from '../../entities/flash-sale.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Order } from '../../entities/order.entity';

@Processor('orders')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(FlashSale)
    private flashSaleRepository: Repository<FlashSale>,
    private dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userEmail, flashSaleId, token, quantity } = job.data;

    this.logger.log(
      `Processing order for ${userEmail}, FlashSale: ${flashSaleId}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find Flash Sale
      const flashSale = await queryRunner.manager.findOne(FlashSale, {
        where: { id: flashSaleId },
        relations: ['item'],
      });

      if (!flashSale) {
        throw new Error('Flash Sale not found');
      }

      // 2. Decrement DB Stock
      if (flashSale.availableStock < quantity) {
        throw new Error('Stock inconsistency');
      }
      flashSale.availableStock -= quantity;
      await queryRunner.manager.save(FlashSale, flashSale);

      // 3. Create Order
      const order = this.orderRepository.create({
        userEmail,
        totalAmount: flashSale.item.price * quantity,
        status: 'PAID',
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // 4. Create Order Item
      const orderItem = this.orderItemRepository.create({
        order: savedOrder,
        item: flashSale.item,
        flashSaleId: flashSale.id,
        quantity,
        price: flashSale.item.price,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Order ${savedOrder.id} created successfully for job ${job.id}`,
      );

      return { success: true, orderId: savedOrder.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process order for job ${job.id}: ${err.message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
