import { CreateCustomerDto } from '../../src/customer/dto/create-customer.dto';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';

export class TestDataFactory {
  static createCustomerData(overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto {
    const timestamp = Date.now();
    return {
      name: `Test Customer ${timestamp}`,
      email: `test${timestamp}@example.com`,
      phone: `555-${String(timestamp).slice(-7)}`,
      address: `${timestamp} Test St`,
      ...overrides,
    };
  }

  static createProductData(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
    const timestamp = Date.now();
    return {
      name: `Test Product ${timestamp}`,
      description: `Test product description ${timestamp}`,
      price: 9.99,
      category: 'test',
      ...overrides,
    };
  }

  static createOrderData(
    customerId: string,
    productIds: string[],
    overrides: Partial<CreateOrderDto> = {}
  ): CreateOrderDto {
    return {
      customerId,
      productIds,
      totalAmount: 25.99,
      notes: 'Test order',
      ...overrides,
    };
  }

  // Pre-defined test data sets for consistency
  static getStandardCustomers(): CreateCustomerDto[] {
    return [
      {
        name: 'John Doe',
        email: 'john.test@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      },
      {
        name: 'Jane Smith',
        email: 'jane.test@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      },
      {
        name: 'Bob Johnson',
        email: 'bob.test@example.com',
        phone: '555-555-5555',
        address: '789 Pine Rd',
      },
    ];
  }

  static getStandardProducts(): CreateProductDto[] {
    return [
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        category: 'pizza',
      },
      {
        name: 'Pepperoni Pizza',
        description: 'Pizza with tomato sauce, mozzarella, and pepperoni',
        price: 14.99,
        category: 'pizza',
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing',
        price: 8.99,
        category: 'salad',
      },
      {
        name: 'Garlic Bread',
        description: 'Toasted bread with garlic butter',
        price: 4.99,
        category: 'appetizer',
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone',
        price: 7.99,
        category: 'dessert',
      },
    ];
  }
}