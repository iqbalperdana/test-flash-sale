import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('acquire-token')
  acquireToken(
    @Body('flashSaleId') flashSaleId: number,
    @Body('userEmail') userEmail: string,
  ) {
    return this.orderService.acquireToken(flashSaleId, userEmail);
  }

  @Get('status/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.orderService.getJobStatus(jobId);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }
}
