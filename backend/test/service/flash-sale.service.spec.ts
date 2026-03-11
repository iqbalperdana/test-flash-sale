import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { FlashSale } from '../../src/entities/flash-sale.entity';
import { Item } from '../../src/entities/item.entity';
import { CreateFlashSaleDto } from '../../src/modules/flash-sale/dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from '../../src/modules/flash-sale/dto/update-flash-sale.dto';
import { FlashSaleRepository } from '../../src/modules/flash-sale/flash-sale.repository';
import { FlashSaleService } from '../../src/modules/flash-sale/flash-sale.service';
import { ItemRepository } from '../../src/modules/item/item.repository';

// Mock uuid to have predictable tokens
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('FlashSaleService', () => {
  let service: FlashSaleService;
  let mockFlashSaleRepository: jest.Mocked<
    Partial<Record<keyof FlashSaleRepository, jest.Mock>>
  >;
  let mockItemRepository: jest.Mocked<
    Partial<Record<keyof ItemRepository, jest.Mock>>
  >;
  let mockRedis: jest.Mocked<Partial<Redis>>;

  const mockItem: Item = {
    id: 1,
    name: 'Test Item',
    description: 'Test Description',
    price: 99.99,
    sku: 'ITEM-1234',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFlashSale: FlashSale = {
    id: 1,
    item: mockItem,
    name: 'Flash sale now',
    availableStock: 10,
    allocatedStock: 10,
    maxPurchaseQty: 1,
    startTime: new Date('2026-03-10T10:00:00Z'),
    endTime: new Date('2026-03-10T12:00:00Z'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateFlashSaleDto: CreateFlashSaleDto = {
    itemId: 1,
    name: 'Flash sale later',
    availableStock: 10,
    startTime: new Date('2026-03-10T10:00:00Z'),
    endTime: new Date('2026-03-10T12:00:00Z'),
    isActive: true,
  };

  const mockUpdateFlashSaleDto: UpdateFlashSaleDto = {
    availableStock: 15,
    isActive: false,
  };

  beforeEach(async () => {
    mockFlashSaleRepository = {
      create: jest.fn(),
      save: jest.fn(),
      getAllFlashSales: jest.fn(),
      getActiveAndUpcomingFlashSales: jest.fn(),
      getFlashSaleById: jest.fn(),
      remove: jest.fn(),
    };

    mockItemRepository = {
      findOne: jest.fn(),
    };

    mockRedis = {
      del: jest.fn(),
      lpush: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashSaleService,
        {
          provide: FlashSaleRepository,
          useValue: mockFlashSaleRepository,
        },
        {
          provide: ItemRepository,
          useValue: mockItemRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<FlashSaleService>(FlashSaleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeRedisTokens', () => {
    const flashSaleId = 1;
    const tokensKey = `flash_sale:${flashSaleId}:tokens`;
    const buyersKey = `flash_sale:${flashSaleId}:buyers`;

    it('should clear existing Redis keys', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(2);

      await service.initializeRedisTokens(flashSaleId, 0);

      expect(mockRedis.del).toHaveBeenCalledWith(tokensKey, buyersKey);
    });

    it('should generate and store tokens when stock > 0', async () => {
      const stock = 3;
      const mockTokens = ['token1', 'token2', 'token3'];
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('token1')
        .mockReturnValueOnce('token2')
        .mockReturnValueOnce('token3');

      (mockRedis.del as jest.Mock).mockResolvedValue(2);
      (mockRedis.lpush as jest.Mock).mockResolvedValue(stock);

      await service.initializeRedisTokens(flashSaleId, stock);

      expect(mockRedis.del).toHaveBeenCalledWith(tokensKey, buyersKey);
      expect(uuidv4).toHaveBeenCalledTimes(stock);
      expect(mockRedis.lpush).toHaveBeenCalledWith(tokensKey, ...mockTokens);
    });

    it('should not generate tokens when stock is 0', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(2);

      await service.initializeRedisTokens(flashSaleId, 0);

      expect(mockRedis.del).toHaveBeenCalledWith(tokensKey, buyersKey);
      expect(uuidv4).not.toHaveBeenCalled();
      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.del as jest.Mock).mockRejectedValue(
        new Error('Redis connection error'),
      );

      await expect(
        service.initializeRedisTokens(flashSaleId, 5),
      ).rejects.toThrow('Redis connection error');
    });
  });

  describe('create', () => {
    it('should create a flash sale successfully', async () => {
      const newFlashSale = { ...mockFlashSale, ...mockCreateFlashSaleDto };

      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
      (mockFlashSaleRepository.create as jest.Mock).mockReturnValue(
        newFlashSale,
      );
      (mockFlashSaleRepository.save as jest.Mock).mockResolvedValue(
        newFlashSale,
      );

      // Spy on initializeRedisTokens
      const initializeSpy = jest
        .spyOn(service, 'initializeRedisTokens')
        .mockResolvedValue(undefined);

      const result = await service.create(mockCreateFlashSaleDto);

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateFlashSaleDto.itemId },
      });
      expect(mockFlashSaleRepository.create).toHaveBeenCalledWith({
        ...mockCreateFlashSaleDto,
        item: mockItem,
      });
      expect(mockFlashSaleRepository.save).toHaveBeenCalledWith(newFlashSale);
      expect(initializeSpy).toHaveBeenCalledWith(
        newFlashSale.id,
        newFlashSale.availableStock,
      );
      expect(result).toEqual(newFlashSale);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreateFlashSaleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockCreateFlashSaleDto)).rejects.toThrow(
        `Item #${mockCreateFlashSaleDto.itemId} not found`,
      );
      expect(mockFlashSaleRepository.create).not.toHaveBeenCalled();
      expect(mockFlashSaleRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors during save', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
      (mockFlashSaleRepository.create as jest.Mock).mockReturnValue(
        mockFlashSale,
      );
      (mockFlashSaleRepository.save as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(mockCreateFlashSaleDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all flash sales', async () => {
      const mockFlashSales = [mockFlashSale, { ...mockFlashSale, id: 2 }];
      (mockFlashSaleRepository.getAllFlashSales as jest.Mock).mockResolvedValue(
        mockFlashSales,
      );

      const result = await service.findAll();

      expect(mockFlashSaleRepository.getAllFlashSales).toHaveBeenCalled();
      expect(result).toEqual(mockFlashSales);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no flash sales exist', async () => {
      (mockFlashSaleRepository.getAllFlashSales as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findPublic', () => {
    it('should return active and upcoming flash sales', async () => {
      const mockFlashSales = [mockFlashSale];
      (
        mockFlashSaleRepository.getActiveAndUpcomingFlashSales as jest.Mock
      ).mockResolvedValue(mockFlashSales);

      const result = await service.findPublic();

      expect(
        mockFlashSaleRepository.getActiveAndUpcomingFlashSales,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockFlashSales);
    });
  });

  describe('findOne', () => {
    it('should return a flash sale when it exists', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );

      const result = await service.findOne(1);

      expect(mockFlashSaleRepository.getFlashSaleById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFlashSale);
    });

    it('should throw NotFoundException when flash sale does not exist', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'FlashSale #999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update flash sale successfully', async () => {
      const existingFlashSale = { ...mockFlashSale };
      const updatedFlashSale = {
        ...existingFlashSale,
        ...mockUpdateFlashSaleDto,
      };

      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        existingFlashSale,
      );
      (mockFlashSaleRepository.save as jest.Mock).mockResolvedValue(
        updatedFlashSale,
      );

      const initializeSpy = jest
        .spyOn(service, 'initializeRedisTokens')
        .mockResolvedValue(undefined);

      const result = await service.update(1, mockUpdateFlashSaleDto);

      expect(mockFlashSaleRepository.getFlashSaleById).toHaveBeenCalledWith(1);
      expect(mockFlashSaleRepository.save).toHaveBeenCalledWith(
        updatedFlashSale,
      );
      expect(initializeSpy).toHaveBeenCalledWith(
        updatedFlashSale.id,
        updatedFlashSale.availableStock,
      );
      expect(result).toEqual(updatedFlashSale);
    });

    it('should update with new item when itemId is provided', async () => {
      const newItem = { ...mockItem, id: 2, name: 'New Item' };
      const updateWithNewItem: UpdateFlashSaleDto = {
        itemId: 2,
      };

      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(newItem);
      (mockFlashSaleRepository.save as jest.Mock).mockResolvedValue({
        ...mockFlashSale,
        item: newItem,
        itemId: 2,
      });

      const initializeSpy = jest
        .spyOn(service, 'initializeRedisTokens')
        .mockResolvedValue(undefined);

      const result = await service.update(1, updateWithNewItem);

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(result.item).toEqual(newItem);
    });

    it('should throw NotFoundException when flash sale does not exist', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.update(999, mockUpdateFlashSaleDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFlashSaleRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when new item does not exist', async () => {
      const updateWithInvalidItem: UpdateFlashSaleDto = {
        itemId: 999,
      };

      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(1, updateWithInvalidItem)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, updateWithInvalidItem)).rejects.toThrow(
        'Item #999 not found',
      );
      expect(mockFlashSaleRepository.save).not.toHaveBeenCalled();
    });

    it('should not reinitialize Redis tokens when stock and isActive unchanged', async () => {
      const updateWithOtherField: UpdateFlashSaleDto = {
        startTime: new Date('2026-03-01T10:00:00Z'),
      };

      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );
      (mockFlashSaleRepository.save as jest.Mock).mockResolvedValue({
        ...mockFlashSale,
        ...updateWithOtherField,
      });

      const initializeSpy = jest
        .spyOn(service, 'initializeRedisTokens')
        .mockResolvedValue(undefined);

      const result = await service.update(1, updateWithOtherField);

      expect(initializeSpy).not.toHaveBeenCalled();
    });

    it('should reinitialize Redis tokens when isActive becomes true', async () => {
      const inactiveFlashSale = { ...mockFlashSale, isActive: false };
      const updateToActive: UpdateFlashSaleDto = {
        isActive: true,
      };

      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        inactiveFlashSale,
      );
      (mockFlashSaleRepository.save as jest.Mock).mockResolvedValue({
        ...inactiveFlashSale,
        isActive: true,
      });

      const initializeSpy = jest
        .spyOn(service, 'initializeRedisTokens')
        .mockResolvedValue(undefined);

      const result = await service.update(1, updateToActive);

      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove flash sale and clean up Redis keys', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );
      (mockFlashSaleRepository.remove as jest.Mock).mockResolvedValue(
        undefined,
      );
      (mockRedis.del as jest.Mock).mockResolvedValue(2);

      await service.remove(1);

      expect(mockFlashSaleRepository.getFlashSaleById).toHaveBeenCalledWith(1);
      expect(mockFlashSaleRepository.remove).toHaveBeenCalledWith(
        mockFlashSale,
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        `flash_sale:${mockFlashSale.id}:tokens`,
        `flash_sale:${mockFlashSale.id}:buyers`,
      );
    });

    it('should throw NotFoundException when flash sale does not exist', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockFlashSaleRepository.remove).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully during removal', async () => {
      (mockFlashSaleRepository.getFlashSaleById as jest.Mock).mockResolvedValue(
        mockFlashSale,
      );
      (mockFlashSaleRepository.remove as jest.Mock).mockResolvedValue(
        undefined,
      );
      (mockRedis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await expect(service.remove(1)).rejects.toThrow('Redis error');
    });
  });
});
