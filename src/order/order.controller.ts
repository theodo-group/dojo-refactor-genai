import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from '../entities/order.entity';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(@Query('status') status?: OrderStatus): Promise<Order[]> {
    return this.orderService.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Get('customer/:customerId')
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string
  ): Promise<Order[]> {
    const dateRange: { start?: Date; end?: Date } = {};
    
    if (startDate) {
      dateRange.start = new Date(startDate);
    }
    
    if (endDate) {
      dateRange.end = new Date(endDate);
    }
    
    return this.orderService.findByCustomer(customerId, Object.keys(dateRange).length > 0 ? dateRange : undefined);
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.orderService.create(createOrderDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.orderService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus): Promise<Order> {
    return this.orderService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.orderService.remove(id);
  }
}