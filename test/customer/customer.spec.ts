import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CustomerService } from '../../src/customer/customer.service';
import { Customer } from '../../src/entities/customer.entity';
import { CustomerBuilder } from '../builders/customer.builder';
import { CreateCustomerDto } from '../../src/customer/dto/create-customer.dto';
import { UpdateCustomerDto } from '../../src/customer/dto/update-customer.dto';

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

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: MockType<Repository<Customer>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repository = module.get(getRepositoryToken(Customer));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active customers', async () => {
      const customers = [
        new CustomerBuilder().withId('1').build(),
        new CustomerBuilder().withId('2').build(),
      ];
      repository.find.mockResolvedValue(customers);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toEqual(customers);
    });

    it('should return empty array when no customers exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toEqual([]);
    });
  });

  describe('findAllWithOrders', () => {
    it('should return all active customers with their orders', async () => {
      const customers = [
        new CustomerBuilder().withId('1').withOrders([]).build(),
        new CustomerBuilder().withId('2').withOrders([]).build(),
      ];
      repository.find.mockResolvedValue(customers);

      const result = await service.findAllWithOrders();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['orders'],
      });
      expect(result).toEqual(customers);
    });
  });

  describe('findOne', () => {
    const testCases = [
      ['1', 'customer-1'],
      ['2', 'customer-2'],
      ['uuid-123', 'customer-uuid'],
    ] as [string, string][];

    it.each(testCases)('should return customer with id %s', async (id, expectedId) => {
      const customer = new CustomerBuilder().withId(expectedId).build();
      repository.findOne.mockResolvedValue(customer);

      const result = await service.findOne(id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id, isActive: true },
      });
      expect(result).toEqual(customer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent not found')
      );
    });

    it('should throw NotFoundException when customer is inactive', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inactive-customer')).rejects.toThrow(
        new NotFoundException('Customer with ID inactive-customer not found')
      );
    });
  });

  describe('findOneWithOrders', () => {
    it('should return customer with orders', async () => {
      const customer = new CustomerBuilder().withId('1').withOrders([]).build();
      repository.findOne.mockResolvedValue(customer);

      const result = await service.findOneWithOrders('1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
        relations: ['orders'],
      });
      expect(result).toEqual(customer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOneWithOrders('non-existent')).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent not found')
      );
    });
  });

  describe('create', () => {
    const createCustomerTestCases = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      },
    ] as CreateCustomerDto[];

    it.each(createCustomerTestCases)('should create customer with data %o', async (createDto) => {
      const createdCustomer = new CustomerBuilder()
        .withName(createDto.name)
        .withEmail(createDto.email)
        .withPhone(createDto.phone)
        .withAddress(createDto.address)
        .build();

      repository.create.mockReturnValue(createdCustomer);
      repository.save.mockResolvedValue(createdCustomer);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(createdCustomer);
      expect(result).toEqual(createdCustomer);
    });
  });

  describe('update', () => {
    it('should update existing customer', async () => {
      const existingCustomer = new CustomerBuilder().withId('1').build();
      const updateDto: UpdateCustomerDto = { name: 'Updated Name', email: 'updated@example.com' };
      const updatedCustomer = new CustomerBuilder()
        .withId('1')
        .withName('Updated Name')
        .withEmail('updated@example.com')
        .build();

      repository.findOne.mockResolvedValue(existingCustomer);
      repository.merge.mockReturnValue(updatedCustomer);
      repository.save.mockResolvedValue(updatedCustomer);

      const result = await service.update('1', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(repository.merge).toHaveBeenCalledWith(existingCustomer, updateDto);
      expect(repository.save).toHaveBeenCalledWith(updatedCustomer);
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'New Name' })).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent not found')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete customer by setting isActive to false', async () => {
      const customer = new CustomerBuilder().withId('1').withIsActive(true).build();
      const deactivatedCustomer = new CustomerBuilder().withId('1').withIsActive(false).build();

      repository.findOne.mockResolvedValue(customer);
      repository.save.mockResolvedValue(deactivatedCustomer);

      await service.remove('1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(customer.isActive).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(customer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent not found')
      );
    });
  });

  describe('permanentlyRemove', () => {
    it('should permanently delete customer', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await service.permanentlyRemove('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when customer not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.permanentlyRemove('non-existent')).rejects.toThrow(
        new NotFoundException('Customer with ID non-existent not found')
      );
    });
  });
});
