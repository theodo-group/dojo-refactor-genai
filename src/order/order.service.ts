import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../entities/order.entity";
import { CustomerService } from "../customer/customer.service";
import { ProductService } from "../product/product.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { LoyaltyService } from "../loyalty/loyalty.service";

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private customerService: CustomerService,
    private productService: ProductService,
    @Inject(forwardRef(() => LoyaltyService))
    private loyaltyService: LoyaltyService
  ) {}

  async findAll(
    status?: OrderStatus | OrderStatus[],
    options?: {
      sort?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.customer", "customer")
      .leftJoinAndSelect("order.products", "products");

    if (status) {
      if (Array.isArray(status)) {
        query.where("order.status IN (:...statuses)", { statuses: status });
      } else {
        query.where("order.status = :status", { status });
      }
    }

    // Handle sorting
    const sort = options?.sort;
    if (sort) {
      switch (sort) {
        case "total_desc":
          query.orderBy("order.totalAmount", "DESC");
          break;
        case "total_asc":
          query.orderBy("order.totalAmount", "ASC");
          break;
        case "date_desc":
          query.orderBy("order.createdAt", "DESC");
          break;
        case "date_asc":
          query.orderBy("order.createdAt", "ASC");
          break;
        default:
          query.orderBy("order.createdAt", "DESC");
      }
    } else {
      query.orderBy("order.createdAt", "DESC");
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["customer", "products"],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByCustomer(
    customerId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.customer", "customer")
      .leftJoinAndSelect("order.products", "products")
      .where("order.customerId = :customerId", { customerId });

    if (dateRange?.start) {
      query.andWhere("order.createdAt >= :start", { start: dateRange.start });
    }

    if (dateRange?.end) {
      query.andWhere("order.createdAt <= :end", { end: dateRange.end });
    }

    return query.getMany();
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { customerId, productIds, totalAmount, notes } = createOrderDto;

    const customer = await this.customerService.findOne(customerId);

    // Create array with all products (including duplicates)
    const products = [];
    for (const productId of productIds) {
      const product = await this.productService.findOne(productId);

      // Validate that product is available
      if (!product.isAvailable) {
        throw new BadRequestException(
          `Product ${product.name} is not available`
        );
      }

      products.push(product);
    }

    // Validate total amount matches product prices
    const calculatedTotal = products.reduce(
      (sum, product) => sum + parseFloat(product.price.toString()),
      0
    );
    const roundedCalculated = Math.round(calculatedTotal * 100) / 100;
    const roundedProvided = Math.round(totalAmount * 100) / 100;

    if (Math.abs(roundedProvided - roundedCalculated) > 0.01) {
      throw new BadRequestException(
        `Total amount ${totalAmount} does not match product prices total ${roundedCalculated}`
      );
    }

    // Apply loyalty discount if customer is eligible
    const discountedAmount = await this.loyaltyService.calculateNextOrderAmount(
      customerId,
      totalAmount
    );

    const order = this.orderRepository.create({
      customerId,
      customer,
      products,
      totalAmount: discountedAmount,
      notes,
    });

    return this.orderRepository.save(order);
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    // Don't allow changing orders that are already delivered or cancelled
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot update order that is already ${order.status}`
      );
    }

    const updatedOrder = this.orderRepository.merge(order, updateOrderDto);
    return this.orderRepository.save(updatedOrder);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);

    // Validate status transitions
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Cannot update a cancelled order");
    }

    if (
      order.status === OrderStatus.DELIVERED &&
      status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException("Cannot change status of delivered order");
    }

    order.status = status;
    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);

    // Only allow cancelling orders that are not delivered
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException("Cannot cancel a delivered order");
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
  }

  async getAnalyticsSummary(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [key: string]: number };
  }> {
    const orders = await this.orderRepository.find({
      where: { status: "delivered" as OrderStatus },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get order counts by status
    const statusCounts = await this.orderRepository
      .createQueryBuilder("order")
      .select("order.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("order.status")
      .getRawMany();

    const ordersByStatus: { [key: string]: number } = {};
    statusCounts.forEach((item) => {
      ordersByStatus[item.status] = parseInt(item.count);
    });

    return {
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      ordersByStatus,
    };
  }

  async getCustomerStats(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteProducts: any[];
    orderFrequency: string;
  }> {
    const orders = await this.orderRepository.find({
      where: { customerId },
      relations: ["products"],
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Calculate favorite products
    const productFrequency: { [key: string]: { count: number; product: any } } =
      {};
    orders.forEach((order) => {
      order.products.forEach((product) => {
        if (!productFrequency[product.id]) {
          productFrequency[product.id] = { count: 0, product };
        }
        productFrequency[product.id].count++;
      });
    });

    const favoriteProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => ({
        ...item.product,
        orderCount: item.count,
      }));

    // Calculate order frequency (simplified)
    let orderFrequency = "low";
    if (totalOrders >= 10) orderFrequency = "high";
    else if (totalOrders >= 5) orderFrequency = "medium";

    return {
      totalOrders,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      favoriteProducts,
      orderFrequency,
    };
  }

  async permanentlyRemove(id: string): Promise<void> {
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
  }
}
