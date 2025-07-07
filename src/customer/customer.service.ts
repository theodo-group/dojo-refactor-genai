import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({ where: { isActive: true } });
  }

  async findAllWithOrders(): Promise<Customer[]> {
    return this.customerRepository.find({
      where: { isActive: true },
      relations: ['orders'],
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, isActive: true },
    });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    
    return customer;
  }

  async findOneWithOrders(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, isActive: true },
      relations: ['orders'],
    });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    
    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check for duplicate email
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: createCustomerDto.email }
    });
    
    if (existingCustomer) {
      throw new ConflictException(`Customer with email ${createCustomerDto.email} already exists`);
    }
    
    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    const updatedCustomer = this.customerRepository.merge(customer, updateCustomerDto);
    return this.customerRepository.save(updatedCustomer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.isActive = false;
    await this.customerRepository.save(customer);
  }

  async permanentlyRemove(id: string): Promise<void> {
    const result = await this.customerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
  }
}