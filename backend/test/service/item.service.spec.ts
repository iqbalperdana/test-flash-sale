import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateItemDto } from '../../src/modules/item/dto/create-item.dto';
import { UpdateItemDto } from '../../src/modules/item/dto/update-item.dto';
import { ItemRepository } from '../../src/modules/item/item.repository';
import { ItemService } from '../../src/modules/item/item.service';

describe('ItemService', () => {
  let service: ItemService;
  let mockItemRepository: jest.Mocked<
    Partial<Record<keyof ItemRepository, jest.Mock>>
  >;

  const mockItem = {
    id: 1,
    name: 'Test Item',
    sku: 'TEST-SKU',
    description: 'Test Description',
    price: 99.99,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateItemDto: CreateItemDto = {
    name: 'New Item',
    sku: 'NEW-SKU',
    description: 'New Description',
    price: 49.99,
  };

  const mockUpdateItemDto: UpdateItemDto = {
    name: 'Updated Item',
    price: 79.99,
  };

  beforeEach(async () => {
    mockItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      getAllItems: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        {
          provide: ItemRepository,
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<ItemService>(ItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new item successfully', async () => {
      const newItem = { ...mockItem, ...mockCreateItemDto };
      (mockItemRepository.create as jest.Mock).mockReturnValue(newItem);
      (mockItemRepository.save as jest.Mock).mockResolvedValue(newItem);

      const result = await service.create(mockCreateItemDto);

      expect(mockItemRepository.create).toHaveBeenCalledWith(mockCreateItemDto);
      expect(mockItemRepository.save).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(newItem);
    });

    it('should handle repository errors during creation', async () => {
      (mockItemRepository.create as jest.Mock).mockReturnValue(mockItem);
      (mockItemRepository.save as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(mockCreateItemDto)).rejects.toThrow(
        'Database error',
      );
      expect(mockItemRepository.create).toHaveBeenCalledWith(mockCreateItemDto);
      expect(mockItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of items', async () => {
      const mockItems = [
        mockItem,
        { ...mockItem, id: 2, name: 'Another Item' },
      ];
      (mockItemRepository.getAllItems as jest.Mock).mockResolvedValue(
        mockItems,
      );

      const result = await service.findAll();

      expect(mockItemRepository.getAllItems).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no items exist', async () => {
      (mockItemRepository.getAllItems as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockItemRepository.getAllItems).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      (mockItemRepository.getAllItems as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return an item when it exists', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);

      const result = await service.findOne(1);

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Item #999 not found');
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should handle repository errors', async () => {
      (mockItemRepository.findOne as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(1)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should update an existing item successfully', async () => {
      const existingItem = { ...mockItem };
      const updatedItem = { ...existingItem, ...mockUpdateItemDto };

      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(existingItem);
      (mockItemRepository.save as jest.Mock).mockResolvedValue(updatedItem);

      const result = await service.update(1, mockUpdateItemDto);

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockItemRepository.save).toHaveBeenCalledWith(updatedItem);
      expect(result).toEqual(updatedItem);
      expect(result.name).toBe(mockUpdateItemDto.name);
      expect(result.price).toBe(mockUpdateItemDto.price);
    });

    it('should throw NotFoundException when updating non-existent item', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, mockUpdateItemDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockItemRepository.save).not.toHaveBeenCalled();
    });

    it('should partially update only provided fields', async () => {
      const existingItem = { ...mockItem };
      const partialUpdate: UpdateItemDto = { price: 129.99 };
      const expectedUpdated = { ...existingItem, price: 129.99 };

      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(existingItem);
      (mockItemRepository.save as jest.Mock).mockResolvedValue(expectedUpdated);

      const result = await service.update(1, partialUpdate);

      expect(mockItemRepository.save).toHaveBeenCalledWith(expectedUpdated);
      expect(result.price).toBe(129.99);
      expect(result.name).toBe(mockItem.name); // Unchanged
    });

    it('should handle repository errors during save', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
      (mockItemRepository.save as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update(1, mockUpdateItemDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('remove', () => {
    it('should remove an existing item successfully', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
      (mockItemRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockItemRepository.remove).toHaveBeenCalledWith(mockItem);
    });

    it('should throw NotFoundException when removing non-existent item', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockItemRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle repository errors during remove', async () => {
      (mockItemRepository.findOne as jest.Mock).mockResolvedValue(mockItem);
      (mockItemRepository.remove as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove(1)).rejects.toThrow('Database error');
    });
  });
});
