import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '../entities/customer.entity';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(@Query('include_orders') includeOrders?: string): Promise<Customer[]> {
    if (includeOrders === 'true') {
      return this.customerService.findAllWithOrders();
    }
    return this.customerService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('include_orders') includeOrders?: string): Promise<Customer> {
    if (includeOrders === 'true') {
      return this.customerService.findOneWithOrders(id);
    }
    return this.customerService.findOne(id);
  }

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customerService.create(createCustomerDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.customerService.remove(id);
  }
}