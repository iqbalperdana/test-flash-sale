import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  ) {}

  async placeFlashSaleOrder(createOrderDto: CreateOrderDto) {
    const { userEmail, flashSaleId, quantity } = createOrderDto;

    // Start database transaction
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
        throw new NotFoundException('Flash Sale not found');
      }

      // 2. Validate Flash Sale Timeline
      const now = new Date();
      if (now < new Date(flashSale.startTime)) {
        throw new BadRequestException('Flash Sale has not started yet');
      }
      if (now > new Date(flashSale.endTime)) {
        throw new BadRequestException('Flash Sale has already ended');
      }
      if (!flashSale.isActive) {
        throw new BadRequestException('Flash Sale is currently inactive');
      }

      // 3. Check Stock
      if (flashSale.availableStock < quantity) {
        throw new BadRequestException('Out of stock');
      }

      // 4. Validate Max Purchase Qty
      if (quantity > flashSale.maxPurchaseQty) {
        throw new BadRequestException(
          `Maximum purchase limit of ${flashSale.maxPurchaseQty} units reached`,
        );
      }

      // 5. Decrement Stock
      flashSale.availableStock -= quantity;
      await queryRunner.manager.save(FlashSale, flashSale);

      // 6. Create Order
      const order = this.orderRepository.create({
        userEmail,
        totalAmount: flashSale.item.price * quantity,
        status: 'PAID', // Automatically paid for this simplified app
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // 7. Create Order Item
      const orderItem = this.orderItemRepository.create({
        order: savedOrder,
        item: flashSale.item,
        flashSaleId: flashSale.id,
        quantity,
        price: flashSale.item.price,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      await queryRunner.commitTransaction();
      return { success: true, orderId: savedOrder.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.orderRepository.find({ order: { createdAt: 'DESC' } });
  }
}
