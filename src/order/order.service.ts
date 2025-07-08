import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    private loyaltyService: LoyaltyService
  ) {}

  async findAll(status?: OrderStatus): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.customer", "customer")
      .leftJoinAndSelect("order.products", "products");

    if (status) {
      query.where("order.status = :status", { status });
    } else {
      // Exclude cancelled orders by default (soft deleted orders)
      query.where("order.status != :cancelledStatus", { cancelledStatus: OrderStatus.CANCELLED });
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

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customer: { id: customerId } },
      relations: ["products", "customer"],
    });
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { customerId, productIds, totalAmount, notes } = createOrderDto;

    const customer = await this.customerService.findOne(customerId);

    const products = [];
    for (const productId of productIds) {
      const product = await this.productService.findOne(productId);
      products.push(product);
    }

    // Validate that products are available
    for (const product of products) {
      if (!product.isAvailable) {
        throw new BadRequestException(
          `Product ${product.name} is not available`
        );
      }
    }

    // Apply loyalty discount if customer is eligible
    const discountedAmount = await this.loyaltyService.calculateNextOrderAmount(
      customerId,
      totalAmount
    );

    const order = this.orderRepository.create({
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

  async permanentlyRemove(id: string): Promise<void> {
    const result = await this.orderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
  }
}
