import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { Order, OrderStatus } from "../entities/order.entity";
import { ParseUUIDPipe } from "../common/pipes/parse-uuid.pipe";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("sort") sort?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<Order[]> {
    let statusFilter: OrderStatus | OrderStatus[] | undefined;

    if (status) {
      const statusArray = status.split(",").map((s) => s.trim() as OrderStatus);
      statusFilter = statusArray.length === 1 ? statusArray[0] : statusArray;
    }

    const options: any = {};
    if (sort) options.sort = sort;
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);

    return this.orderService.findAll(
      statusFilter,
      Object.keys(options).length > 0 ? options : undefined
    );
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Get("customer/:customerId")
  async findByCustomer(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string
  ): Promise<Order[]> {
    const dateRange: { start?: Date; end?: Date } = {};

    if (startDate) {
      dateRange.start = new Date(startDate);
    }

    if (endDate) {
      dateRange.end = new Date(endDate);
    }

    return this.orderService.findByCustomer(
      customerId,
      Object.keys(dateRange).length > 0 ? dateRange : undefined
    );
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.orderService.create(createOrderDto);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto
  ): Promise<Order> {
    return this.orderService.update(id, updateOrderDto);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ): Promise<Order> {
    return this.orderService.updateStatus(id, updateOrderStatusDto.status);
  }

  @Get("analytics/summary")
  async getAnalyticsSummary(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [key: string]: number };
  }> {
    return this.orderService.getAnalyticsSummary();
  }

  @Get("customer/:customerId/stats")
  async getCustomerStats(
    @Param("customerId", ParseUUIDPipe) customerId: string
  ): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteProducts: any[];
    orderFrequency: string;
  }> {
    return this.orderService.getCustomerStats(customerId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.orderService.remove(id);
  }
}
