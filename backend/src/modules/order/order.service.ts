import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { FlashSale } from '../../entities/flash-sale.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Order } from '../../entities/order.entity';
import { OrderCheckoutDto } from './dto/order-checkout.dto';
import { OrderPaymentDto } from './dto/order-payment.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(FlashSale)
    private flashSaleRepository: Repository<FlashSale>,
    private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectQueue('orders') private orderQueue: Queue,
  ) {}

  async handleCreateOrder(data: any) {
    const { userEmail, flashSaleId, token, quantity } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const flashSale = await queryRunner.manager.findOne(FlashSale, {
        where: { id: flashSaleId },
        relations: ['item'],
      });

      if (!flashSale) throw new Error('Flash Sale not found');
      if (flashSale.availableStock < quantity)
        throw new Error('Stock inconsistency');

      flashSale.availableStock -= quantity;
      await queryRunner.manager.save(FlashSale, flashSale);

      const order = this.orderRepository.create({
        userEmail,
        totalAmount: flashSale.item.price * quantity,
        status: 'PENDING',
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      const orderItem = this.orderItemRepository.create({
        order: savedOrder,
        item: flashSale.item,
        flashSaleId: flashSale.id,
        quantity,
        price: flashSale.item.price,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      await queryRunner.commitTransaction();

      // Schedule Expiration Job
      await this.orderQueue.add(
        'expire-order',
        { orderId: savedOrder.id, flashSaleId, userEmail, token },
        { delay: 10 * 60 * 1000 },
      );

      return { success: true, orderId: savedOrder.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async handleExpireOrder(data: any) {
    const { orderId, flashSaleId, userEmail, token } = data;

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order || order.status !== 'PENDING') return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = 'EXPIRED';
      await queryRunner.manager.save(Order, order);

      const flashSale = await queryRunner.manager.findOne(FlashSale, {
        where: { id: flashSaleId },
      });
      if (flashSale) {
        flashSale.availableStock += 1;
        await queryRunner.manager.save(FlashSale, flashSale);
      }

      await queryRunner.commitTransaction();

      const tokensKey = this.getTokensKey(flashSaleId);
      const buyersKey = this.getBuyersKey(flashSaleId);

      await Promise.all([
        this.redis.srem(buyersKey, userEmail),
        this.redis.lpush(tokensKey, token),
      ]);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private getTokensKey(id: number) {
    return `flash_sale:${id}:tokens`;
  }

  private getBuyersKey(id: number) {
    return `flash_sale:${id}:buyers`;
  }

  async checkout(orderCheckoutDto: OrderCheckoutDto) {
    const tokensKey = this.getTokensKey(orderCheckoutDto.flashSaleId);
    const buyersKey = this.getBuyersKey(orderCheckoutDto.flashSaleId);

    // 1. Check if user already purchased (SADD returns 1 if new, 0 if already in set)
    const isNewBuyer = await this.redis.sadd(
      buyersKey,
      orderCheckoutDto.userEmail,
    );
    if (!isNewBuyer) {
      throw new BadRequestException('Already purchased this item');
    }

    // 2. Try to get a token (RPOP gets one token from the list)
    const token = await this.redis.rpop(tokensKey);

    if (!token) {
      // Revert buyer set if no tokens left
      await this.redis.srem(buyersKey, orderCheckoutDto.userEmail);
      throw new BadRequestException('Sold out');
    }

    // 3. Dispatch Job to BullMQ
    const job = await this.orderQueue.add('create-order', {
      userEmail: orderCheckoutDto.userEmail,
      flashSaleId: orderCheckoutDto.flashSaleId,
      token,
      quantity: 1, // Fixed to 1 as per flash sale usual constraint
    });

    return {
      token,
      jobId: job.id,
      message: 'Spot secured! Processing your order...',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.orderQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const result = job.returnvalue;

    return {
      status: state,
      result: result,
    };
  }

  async findAll() {
    return this.orderRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems', 'orderItems.item'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updatePaymentStatus(orderId: number, orderPaymentDto: OrderPaymentDto) {
    const order = await this.findOne(orderId);
    order.status = orderPaymentDto.paymentStatus;
    return this.orderRepository.save(order);
  }
}
