import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from '../../src/product/product.service';
import { Product } from '../../src/entities/product.entity';
import { ProductBuilder } from '../builders/product.builder';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { UpdateProductDto } from '../../src/product/dto/update-product.dto';

export type MockType<T> = {
  [P in keyof T]?: jest.Mock<any>;
};

const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
}));

describe('ProductService', () => {
  let service: ProductService;
  let repository: MockType<Repository<Product>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(getRepositoryToken(Product));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all available products when no category specified', async () => {
      const products = [
        new ProductBuilder().withId('1').withCategory('pizza').build(),
        new ProductBuilder().withId('2').withCategory('salad').build(),
      ];
      repository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { isAvailable: true } });
      expect(result).toEqual(products);
    });

    const categoryTestCases = [
      'pizza',
      'salad',
      'appetizer',
      'dessert',
    ];

    it.each(categoryTestCases)('should return products filtered by category %s', async (category) => {
      const products = [
        new ProductBuilder().withId('1').withCategory(category).build(),
        new ProductBuilder().withId('2').withCategory(category).build(),
      ];
      repository.find.mockResolvedValue(products);

      const result = await service.findAll(category);

      expect(repository.find).toHaveBeenCalledWith({
        where: { category, isAvailable: true },
      });
      expect(result).toEqual(products);
    });

    it('should return empty array when no products exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { isAvailable: true } });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const testCases = [
      ['1', 'product-1'],
      ['2', 'product-2'],
      ['uuid-123', 'product-uuid'],
    ] as [string, string][];

    it.each(testCases)('should return product with id %s', async (id, expectedId) => {
      const product = new ProductBuilder().withId(expectedId).build();
      repository.findOne.mockResolvedValue(product);

      const result = await service.findOne(id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id, isAvailable: true },
      });
      expect(result).toEqual(product);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Product with ID non-existent not found')
      );
    });

    it('should throw NotFoundException when product is not available', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('unavailable-product')).rejects.toThrow(
        new NotFoundException('Product with ID unavailable-product not found')
      );
    });
  });

  describe('create', () => {
    const createProductTestCases = [
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        category: 'pizza',
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh salad with romaine lettuce and Caesar dressing',
        price: 8.99,
        category: 'salad',
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        price: 7.99,
        category: 'dessert',
      },
    ] as CreateProductDto[];

    it.each(createProductTestCases)('should create product with data %o', async (createDto) => {
      const createdProduct = new ProductBuilder()
        .withName(createDto.name)
        .withDescription(createDto.description)
        .withPrice(createDto.price)
        .withCategory(createDto.category)
        .build();

      repository.create.mockReturnValue(createdProduct);
      repository.save.mockResolvedValue(createdProduct);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(createdProduct);
      expect(result).toEqual(createdProduct);
    });
  });

  describe('update', () => {
    it('should update existing product', async () => {
      const existingProduct = new ProductBuilder().withId('1').build();
      const updateDto: UpdateProductDto = {
        name: 'Updated Pizza',
        price: 15.99,
        description: 'Updated description'
      };
      const updatedProduct = new ProductBuilder()
        .withId('1')
        .withName('Updated Pizza')
        .withPrice(15.99)
        .withDescription('Updated description')
        .build();

      repository.findOne.mockResolvedValue(existingProduct);
      repository.merge.mockReturnValue(updatedProduct);
      repository.save.mockResolvedValue(updatedProduct);

      const result = await service.update('1', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isAvailable: true },
      });
      expect(repository.merge).toHaveBeenCalledWith(existingProduct, updateDto);
      expect(repository.save).toHaveBeenCalledWith(updatedProduct);
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'New Name' })).rejects.toThrow(
        new NotFoundException('Product with ID non-existent not found')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete product by setting isAvailable to false', async () => {
      const product = new ProductBuilder().withId('1').withIsAvailable(true).build();
      const deactivatedProduct = new ProductBuilder().withId('1').withIsAvailable(false).build();

      repository.findOne.mockResolvedValue(product);
      repository.save.mockResolvedValue(deactivatedProduct);

      await service.remove('1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isAvailable: true },
      });
      expect(product.isAvailable).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(product);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException('Product with ID non-existent not found')
      );
    });
  });

  describe('permanentlyRemove', () => {
    it('should permanently delete product', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await service.permanentlyRemove('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.permanentlyRemove('non-existent')).rejects.toThrow(
        new NotFoundException('Product with ID non-existent not found')
      );
    });
  });
});
