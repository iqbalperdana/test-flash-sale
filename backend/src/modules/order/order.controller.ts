import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('flash-sale')
  placeOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.placeFlashSaleOrder(createOrderDto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }
}
