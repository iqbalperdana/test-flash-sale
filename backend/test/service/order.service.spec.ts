import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FlashSale } from '../../src/entities/flash-sale.entity';
import { OrderItem } from '../../src/entities/order-item.entity';
import { Order } from '../../src/entities/order.entity';
import { OrderCheckoutDto } from '../../src/modules/order/dto/order-checkout.dto';
import { OrderPaymentDto } from '../../src/modules/order/dto/order-payment.dto';
import { OrderRepository } from '../../src/modules/order/order.repository';
import { OrderService } from '../../src/modules/order/order.service';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepository: jest.Mocked<Partial<OrderRepository>>;
  let mockOrderItemRepository: jest.Mocked<Partial<Repository<OrderItem>>>;
  let mockFlashSaleRepository: jest.Mocked<Partial<Repository<FlashSale>>>;
  let mockDataSource: jest.Mocked<Partial<DataSource>>;
  let mockRedis: jest.Mocked<any>;
  let mockQueue: jest.Mocked<any>;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Create mock query runner with all necessary methods
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
    };

    mockOrderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      getAllOrdersWithDetails: jest.fn(),
      findPendingOrders: jest.fn(),
      findOne: jest.fn(),
    };

    mockOrderItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockFlashSaleRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockRedis = {
      sadd: jest.fn(),
      srem: jest.fn(),
      rpop: jest.fn(),
      lpush: jest.fn(),
    };

    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: mockOrderRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(FlashSale),
          useValue: mockFlashSaleRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: getQueueToken('orders'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCreateOrder', () => {
    const createOrderData = {
      userEmail: 'test@example.com',
      flashSaleId: 1,
      token: 'test-token',
      quantity: 2,
    };

    const mockFlashSale = {
      id: 1,
      availableStock: 10,
      item: {
        id: 1,
        price: 100,
      },
    };

    const mockOrder = {
      id: 1,
      userEmail: 'test@example.com',
      totalAmount: 200,
      status: 'PENDING',
    };

    const mockOrderItem = {
      order: mockOrder,
      item: mockFlashSale.item,
      flashSaleId: mockFlashSale.id,
      quantity: 2,
      price: 100,
    };

    it('should successfully create an order', async () => {
      // Mock flash sale found
      mockQueryRunner.manager.findOne.mockResolvedValue(mockFlashSale);

      // Mock order creation
      (mockOrderRepository.create as jest.Mock).mockReturnValue({
        ...mockOrder,
      });
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...mockFlashSale }) // First save for flash sale
        .mockResolvedValueOnce({ ...mockOrder }); // Second save for order

      (mockOrderItemRepository.create as jest.Mock).mockReturnValue({
        ...mockOrderItem,
      });
      mockQueryRunner.manager.save.mockResolvedValueOnce({ ...mockOrderItem }); // Third save for order item

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.handleCreateOrder(createOrderData);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(FlashSale, {
        where: { id: 1 },
        relations: ['item'],
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'expire-order',
        {
          orderId: 1,
          flashSaleId: 1,
          userEmail: 'test@example.com',
          token: 'test-token',
        },
        { delay: 10 * 60 * 1000 },
      );
      expect(result).toEqual({ success: true, orderId: 1 });
    });

    it('should throw error if flash sale not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.handleCreateOrder(createOrderData)).rejects.toThrow(
        'Flash Sale not found',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if insufficient stock', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockFlashSale,
        availableStock: 1, // Less than requested quantity of 2
      });

      await expect(service.handleCreateOrder(createOrderData)).rejects.toThrow(
        'Stock inconsistency',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.handleCreateOrder(createOrderData)).rejects.toThrow(
        'Database error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('handleExpireOrder', () => {
    const expireOrderData = {
      orderId: 1,
      flashSaleId: 1,
      userEmail: 'test@example.com',
      token: 'test-token',
    };

    const mockOrder = {
      id: 1,
      status: 'PENDING',
    };

    const mockFlashSale = {
      id: 1,
      availableStock: 5,
    };

    it('should expire order and restore stock', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockOrder,
      });
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockFlashSale });
      mockQueryRunner.manager.save.mockResolvedValue({});

      await service.handleExpireOrder(expireOrderData);

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2); // Order and FlashSale
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'flash_sale:1:buyers',
        'test@example.com',
      );
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'flash_sale:1:tokens',
        'test-token',
      );
    });

    it('should do nothing if order not found', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.handleExpireOrder(expireOrderData);

      expect(mockOrderRepository.findOne).toHaveBeenCalled();
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
      expect(mockRedis.srem).not.toHaveBeenCalled();
    });

    it('should do nothing if order status is not PENDING', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'COMPLETED',
      });

      await service.handleExpireOrder(expireOrderData);

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
      expect(mockRedis.srem).not.toHaveBeenCalled();
    });

    it('should handle missing flash sale gracefully', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockOrder,
      });
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue({});

      await service.handleExpireOrder(expireOrderData);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockOrder,
      });
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockFlashSale,
      });
      (mockQueryRunner.manager.save as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.handleExpireOrder(expireOrderData)).rejects.toThrow(
        'Database error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('checkout', () => {
    const checkoutDto: OrderCheckoutDto = {
      userEmail: 'test@example.com',
      flashSaleId: 1,
    };

    it('should successfully checkout', async () => {
      mockRedis.sadd.mockResolvedValue(1); // New buyer
      mockRedis.rpop.mockResolvedValue('test-token');
      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.checkout(checkoutDto);

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'flash_sale:1:buyers',
        'test@example.com',
      );
      expect(mockRedis.rpop).toHaveBeenCalledWith('flash_sale:1:tokens');
      expect(mockQueue.add).toHaveBeenCalledWith('create-order', {
        userEmail: 'test@example.com',
        flashSaleId: 1,
        token: 'test-token',
        quantity: 1,
      });
      expect(result).toEqual({
        token: 'test-token',
        jobId: 'job-123',
        message: 'Spot secured! Processing your order...',
      });
    });

    it('should throw error if user already purchased', async () => {
      mockRedis.sadd.mockResolvedValue(0); // Already existing buyer

      await expect(service.checkout(checkoutDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRedis.rpop).not.toHaveBeenCalled();
    });

    it('should throw error if no tokens available', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.rpop.mockResolvedValue(null); // No token

      await expect(service.checkout(checkoutDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'flash_sale:1:buyers',
        'test@example.com',
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status and result', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        returnvalue: { success: true, orderId: 1 },
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus('job-123');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(result).toEqual({
        status: 'completed',
        result: { success: true, orderId: 1 },
      });
    });

    it('should throw NotFoundException if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getJobStatus('job-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders with details', async () => {
      const mockOrders = [{ id: 1 }, { id: 2 }];
      (
        mockOrderRepository.getAllOrdersWithDetails as jest.Mock
      ).mockResolvedValue(mockOrders);

      const result = await service.findAll();

      expect(mockOrderRepository.getAllOrdersWithDetails).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
    const mockOrder = {
      id: 1,
      orderItems: [],
    };

    it('should return order if found', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOne(1);

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['orderItems', 'orderItems.item'],
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      (mockOrderRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePaymentStatus', () => {
    const paymentDto: OrderPaymentDto = {
      paymentStatus: 'COMPLETED',
    };

    it('should update payment status', async () => {
      const mockOrder = { id: 1, status: 'PENDING' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrder as Order);
      (mockOrderRepository.save as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'COMPLETED',
      });

      const result = await service.updatePaymentStatus(1, paymentDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
        status: 'COMPLETED',
      });
    });
  });

  describe('findPendingOrders', () => {
    it('should find pending orders for user', async () => {
      const mockPendingOrders = [{ id: 1, status: 'PENDING' }];
      (mockOrderRepository.findPendingOrders as jest.Mock).mockResolvedValue(
        mockPendingOrders,
      );

      const result = await service.findPendingOrders('test@example.com');

      expect(mockOrderRepository.findPendingOrders).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
      );
      expect(result).toEqual(mockPendingOrders);
    });

    it('should find pending orders for user and flash sale', async () => {
      const mockPendingOrder = { id: 1, status: 'PENDING' };
      (mockOrderRepository.findPendingOrders as jest.Mock).mockResolvedValue(
        mockPendingOrder,
      );

      const result = await service.findPendingOrders('test@example.com', 1);

      expect(mockOrderRepository.findPendingOrders).toHaveBeenCalledWith(
        'test@example.com',
        1,
      );
      expect(result).toEqual(mockPendingOrder);
    });

    it('should throw NotFoundException if flashSaleId provided and no result', async () => {
      (mockOrderRepository.findPendingOrders as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.findPendingOrders('test@example.com', 1),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
