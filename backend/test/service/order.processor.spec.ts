import { Test, TestingModule } from '@nestjs/testing';
import { OrderProcessor } from '../../src/modules/order/order.processor';
import { OrderService } from '../../src/modules/order/order.service';

describe('OrderProcessor', () => {
  let processor: OrderProcessor;
  let orderService: any;

  beforeEach(async () => {
    const mockOrderService = {
      handleCreateOrder: jest.fn(),
      handleExpireOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProcessor,
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    processor = module.get<OrderProcessor>(OrderProcessor);
    orderService = module.get<OrderService>(OrderService);
  });

  describe('process', () => {
    it('should call handleCreateOrder on create-order job', async () => {
      const job = { name: 'create-order', data: { id: 1 }, id: 'job1' };
      await processor.process(job as any);
      expect(orderService.handleCreateOrder).toHaveBeenCalledWith(job.data);
    });

    it('should call handleExpireOrder on expire-order job', async () => {
      const job = { name: 'expire-order', data: { id: 1 }, id: 'job2' };
      await processor.process(job as any);
      expect(orderService.handleExpireOrder).toHaveBeenCalledWith(job.data);
    });
  });
});
