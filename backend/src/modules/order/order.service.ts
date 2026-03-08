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
import { CreateOrderDto } from './dto/create-order.dto';

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

  private getTokensKey(id: number) {
    return `flash_sale:${id}:tokens`;
  }

  private getBuyersKey(id: number) {
    return `flash_sale:${id}:buyers`;
  }

  async acquireToken(flashSaleId: number, userEmail: string) {
    const tokensKey = this.getTokensKey(flashSaleId);
    const buyersKey = this.getBuyersKey(flashSaleId);

    // 1. Check if user already purchased (SADD returns 1 if new, 0 if already in set)
    const isNewBuyer = await this.redis.sadd(buyersKey, userEmail);
    if (!isNewBuyer) {
      throw new BadRequestException('Already purchased this item');
    }

    // 2. Try to get a token (RPOP gets one token from the list)
    const token = await this.redis.rpop(tokensKey);

    if (!token) {
      // Revert buyer set if no tokens left
      await this.redis.srem(buyersKey, userEmail);
      throw new BadRequestException('Sold out');
    }

    // 3. Dispatch Job to BullMQ
    const job = await this.orderQueue.add('create-order', {
      userEmail,
      flashSaleId,
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

  // legacy or internal manual order
  async createManualOrder(createOrderDto: CreateOrderDto) {
    // standard order logic if needed
  }
}
