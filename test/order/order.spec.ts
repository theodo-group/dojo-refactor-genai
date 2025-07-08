import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderService } from '../../src/order/order.service';
import { CustomerService } from '../../src/customer/customer.service';
import { ProductService } from '../../src/product/product.service';
import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { OrderBuilder } from '../builders/order.builder';
import { CustomerBuilder } from '../builders/customer.builder';
import { ProductBuilder } from '../builders/product.builder';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';
import { UpdateOrderDto } from '../../src/order/dto/update-order.dto';

export type MockType<T> = {
  [P in keyof T]?: jest.Mock<any>;
};

const createQueryBuilderMock = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
});

const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
}));

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: MockType<Repository<Order>>;
  let customerService: jest.Mocked<CustomerService>;
  let productService: jest.Mocked<ProductService>;
  let loyaltyService: jest.Mocked<LoyaltyService>;
  let queryBuilder: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useFactory: repositoryMockFactory,
        },
        {
          provide: CustomerService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ProductService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            calculateNextOrderAmount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    customerService = module.get(CustomerService);
    productService = module.get(ProductService);
    loyaltyService = module.get(LoyaltyService);
    queryBuilder = createQueryBuilderMock();
    orderRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all orders when no status filter provided', async () => {
      const orders = [
        new OrderBuilder().withId('1').build(),
        new OrderBuilder().withId('2').build(),
      ];
      queryBuilder.getMany.mockResolvedValue(orders);

      const result = await service.findAll();

      expect(orderRepository.createQueryBuilder).toHaveBeenCalledWith('order');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('order.customer', 'customer');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('order.products', 'products');
      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual(orders);
    });

    const statusTestCases = [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    it.each(statusTestCases)('should return orders filtered by status %s', async (status) => {
      const orders = [
        new OrderBuilder().withId('1').withStatus(status).build(),
        new OrderBuilder().withId('2').withStatus(status).build(),
      ];
      queryBuilder.getMany.mockResolvedValue(orders);

      const result = await service.findAll(status);

      expect(orderRepository.createQueryBuilder).toHaveBeenCalledWith('order');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('order.customer', 'customer');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('order.products', 'products');
      expect(queryBuilder.where).toHaveBeenCalledWith('order.status = :status', { status });
      expect(result).toEqual(orders);
    });
  });

  describe('findOne', () => {
    it('should return order with relations', async () => {
      const order = new OrderBuilder().withId('1').build();
      orderRepository.findOne.mockResolvedValue(order);

      const result = await service.findOne('1');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['customer', 'products'],
      });
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Order with ID non-existent not found')
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return orders for specific customer', async () => {
      const orders = [
        new OrderBuilder().withId('1').build(),
        new OrderBuilder().withId('2').build(),
      ];
      orderRepository.find.mockResolvedValue(orders);

      const result = await service.findByCustomer('customer-1');

      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { customer: { id: 'customer-1' } },
        relations: ['products', 'customer'],
      });
      expect(result).toEqual(orders);
    });
  });

  describe('create', () => {
    const createOrderTestCases = [
      {
        customerId: 'customer-1',
        productIds: ['product-1', 'product-2'],
        totalAmount: 100,
        notes: 'Test order',
      },
      {
        customerId: 'customer-2',
        productIds: ['product-3'],
        totalAmount: 50,
        notes: null,
      },
    ] as CreateOrderDto[];

    it.each(createOrderTestCases)('should create order with data %o', async (createDto) => {
      const customer = new CustomerBuilder().withId(createDto.customerId).build();
      const products = createDto.productIds.map((id, index) =>
        new ProductBuilder().withId(id).withIsAvailable(true).build()
      );
      const discountedAmount = createDto.totalAmount * 0.9;
      const createdOrder = new OrderBuilder()
        .withCustomer(customer)
        .withProducts(products)
        .withTotalAmount(discountedAmount)
        .withNotes(createDto.notes)
        .build();

      customerService.findOne.mockResolvedValue(customer);
      productService.findOne.mockImplementation((id) =>
        Promise.resolve(products.find((p) => p.id === id))
      );
      loyaltyService.calculateNextOrderAmount.mockResolvedValue(discountedAmount);
      orderRepository.create.mockReturnValue(createdOrder);
      orderRepository.save.mockResolvedValue(createdOrder);

      const result = await service.create(createDto);

      expect(customerService.findOne).toHaveBeenCalledWith(createDto.customerId);
      expect(productService.findOne).toHaveBeenCalledTimes(createDto.productIds.length);
      createDto.productIds.forEach((productId) => {
        expect(productService.findOne).toHaveBeenCalledWith(productId);
      });
      expect(loyaltyService.calculateNextOrderAmount).toHaveBeenCalledWith(
        createDto.customerId,
        createDto.totalAmount
      );
      expect(orderRepository.create).toHaveBeenCalledWith({
        customer,
        products,
        totalAmount: discountedAmount,
        notes: createDto.notes,
      });
      expect(orderRepository.save).toHaveBeenCalledWith(createdOrder);
      expect(result).toEqual(createdOrder);
    });

    it('should throw BadRequestException when product is not available', async () => {
      const customer = new CustomerBuilder().withId('customer-1').build();
      const unavailableProduct = new ProductBuilder()
        .withId('product-1')
        .withName('Unavailable Product')
        .withIsAvailable(false)
        .build();

      customerService.findOne.mockResolvedValue(customer);
      productService.findOne.mockResolvedValue(unavailableProduct);

      await expect(
        service.create({
          customerId: 'customer-1',
          productIds: ['product-1'],
          totalAmount: 100,
        })
      ).rejects.toThrow(new BadRequestException('Product Unavailable Product is not available'));
    });
  });

  describe('update', () => {
    it('should update order when status allows it', async () => {
      const existingOrder = new OrderBuilder()
        .withId('1')
        .withStatus(OrderStatus.PENDING)
        .build();
      const updateDto: UpdateOrderDto = { notes: 'Updated notes' };
      const updatedOrder = new OrderBuilder()
        .withId('1')
        .withStatus(OrderStatus.PENDING)
        .withNotes('Updated notes')
        .build();

      orderRepository.findOne.mockResolvedValue(existingOrder);
      orderRepository.merge.mockReturnValue(updatedOrder);
      orderRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.update('1', updateDto);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['customer', 'products'],
      });
      expect(orderRepository.merge).toHaveBeenCalledWith(existingOrder, updateDto);
      expect(orderRepository.save).toHaveBeenCalledWith(updatedOrder);
      expect(result).toEqual(updatedOrder);
    });

    const nonUpdatableStatuses = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

    it.each(nonUpdatableStatuses)(
      'should throw BadRequestException when order status is %s',
      async (status) => {
        const existingOrder = new OrderBuilder().withId('1').withStatus(status).build();
        orderRepository.findOne.mockResolvedValue(existingOrder);

        await expect(service.update('1', { notes: 'Updated notes' })).rejects.toThrow(
          new BadRequestException(`Cannot update order that is already ${status}`)
        );
      }
    );

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { notes: 'Updated notes' })).rejects.toThrow(
        new NotFoundException('Order with ID non-existent not found')
      );
    });
  });

  describe('updateStatus', () => {
    const validStatusTransitions = [
      [OrderStatus.PENDING, OrderStatus.PREPARING],
      [OrderStatus.PREPARING, OrderStatus.READY],
      [OrderStatus.READY, OrderStatus.DELIVERED],
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
    ] as [OrderStatus, OrderStatus][];

    it.each(validStatusTransitions)(
      'should update status from %s to %s',
      async (currentStatus, newStatus) => {
        const order = new OrderBuilder().withId('1').withStatus(currentStatus).build();
        const updatedOrder = new OrderBuilder().withId('1').withStatus(newStatus).build();

        orderRepository.findOne.mockResolvedValue(order);
        orderRepository.save.mockResolvedValue(updatedOrder);

        const result = await service.updateStatus('1', newStatus);

        expect(order.status).toBe(newStatus);
        expect(orderRepository.save).toHaveBeenCalledWith(order);
        expect(result).toEqual(updatedOrder);
      }
    );

    it('should throw BadRequestException when trying to update cancelled order', async () => {
      const order = new OrderBuilder().withId('1').withStatus(OrderStatus.CANCELLED).build();
      orderRepository.findOne.mockResolvedValue(order);

      await expect(service.updateStatus('1', OrderStatus.PREPARING)).rejects.toThrow(
        new BadRequestException('Cannot update a cancelled order')
      );
    });

    it('should throw BadRequestException when trying to change delivered order status', async () => {
      const order = new OrderBuilder().withId('1').withStatus(OrderStatus.DELIVERED).build();
      orderRepository.findOne.mockResolvedValue(order);

      await expect(service.updateStatus('1', OrderStatus.PREPARING)).rejects.toThrow(
        new BadRequestException('Cannot change status of delivered order')
      );
    });

    it('should allow keeping delivered status as delivered', async () => {
      const order = new OrderBuilder().withId('1').withStatus(OrderStatus.DELIVERED).build();
      const updatedOrder = new OrderBuilder().withId('1').withStatus(OrderStatus.DELIVERED).build();

      orderRepository.findOne.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('1', OrderStatus.DELIVERED);

      expect(result).toEqual(updatedOrder);
    });
  });

  describe('remove', () => {
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.CANCELLED,
    ];

    it.each(cancellableStatuses)('should cancel order with status %s', async (status) => {
      const order = new OrderBuilder().withId('1').withStatus(status).build();
      const cancelledOrder = new OrderBuilder().withId('1').withStatus(OrderStatus.CANCELLED).build();

      orderRepository.findOne.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(cancelledOrder);

      await service.remove('1');

      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(orderRepository.save).toHaveBeenCalledWith(order);
    });

    it('should throw BadRequestException when trying to cancel delivered order', async () => {
      const order = new OrderBuilder().withId('1').withStatus(OrderStatus.DELIVERED).build();
      orderRepository.findOne.mockResolvedValue(order);

      await expect(service.remove('1')).rejects.toThrow(
        new BadRequestException('Cannot cancel a delivered order')
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException('Order with ID non-existent not found')
      );
    });
  });

  describe('permanentlyRemove', () => {
    it('should permanently delete order', async () => {
      orderRepository.delete.mockResolvedValue({ affected: 1 });

      await service.permanentlyRemove('1');

      expect(orderRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.permanentlyRemove('non-existent')).rejects.toThrow(
        new NotFoundException('Order with ID non-existent not found')
      );
    });
  });
});
