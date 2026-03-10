import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from './order.service';

@Processor('orders')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly orderService: OrderService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of name ${job.name}`);

    switch (job.name) {
      case 'create-order':
        return await this.orderService.handleCreateOrder(job.data);
      case 'expire-order':
        return await this.orderService.handleExpireOrder(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
    }
  }
}
