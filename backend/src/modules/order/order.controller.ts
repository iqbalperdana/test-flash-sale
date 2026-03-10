import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrderCheckoutDto } from './dto/order-checkout.dto';
import { OrderPaymentDto } from './dto/order-payment.dto';
import { OrderService } from './order.service';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  async checkout(@Body() orderCheckoutDto: OrderCheckoutDto) {
    return await this.orderService.checkout(orderCheckoutDto);
  }

  @Get('status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return await this.orderService.getJobStatus(jobId);
  }

  @Get()
  async findAll() {
    return await this.orderService.findAll();
  }

  @Get(':orderId')
  async findOne(@Param('orderId') orderId: number) {
    return await this.orderService.findOne(orderId);
  }

  @Post(':orderId/payment')
  async updatePaymentStatus(
    @Param('orderId') orderId: number,
    @Body() orderPaymentDto: OrderPaymentDto,
  ) {
    return await this.orderService.updatePaymentStatus(
      orderId,
      orderPaymentDto,
    );
  }
}
