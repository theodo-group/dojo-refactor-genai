import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../entities/product.entity";
import { Order, OrderStatus } from "../entities/order.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>
  ) {}

  async findAll(
    category?: string,
    available?: boolean,
    sort?: string,
    priceMin?: number,
    priceMax?: number,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder("product");

    if (category) {
      query.andWhere("product.category = :category", { category });
    }

    if (available !== undefined) {
      query.andWhere("product.isAvailable = :available", { available });
    } else {
      // Default behavior: only show available products
      query.andWhere("product.isAvailable = :available", { available: true });
    }

    if (priceMin !== undefined) {
      query.andWhere("product.price >= :priceMin", { priceMin });
    }

    if (priceMax !== undefined) {
      query.andWhere("product.price <= :priceMax", { priceMax });
    }

    if (search) {
      query.andWhere("LOWER(product.name) LIKE LOWER(:search)", {
        search: `%${search}%`,
      });
    }

    // Handle sorting
    if (sort) {
      switch (sort) {
        case "price_asc":
          query.orderBy("product.price", "ASC");
          break;
        case "price_desc":
          query.orderBy("product.price", "DESC");
          break;
        case "name_asc":
          query.orderBy("product.name", "ASC");
          break;
        case "name_desc":
          query.orderBy("product.name", "DESC");
          break;
        default:
          query.orderBy("product.createdAt", "DESC");
      }
    } else {
      query.orderBy("product.createdAt", "DESC");
    }

    if (limit !== undefined) {
      query.limit(limit);
    }

    if (offset !== undefined) {
      query.offset(offset);
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findOneAvailable(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isAvailable: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Validate price
    if (createProductDto.price <= 0) {
      throw new BadRequestException("Product price must be greater than zero");
    }

    // Check for duplicate name (including inactive products)
    const existingProduct = await this.productRepository.findOne({
      where: { name: createProductDto.name },
    });

    if (existingProduct) {
      throw new ConflictException(
        `Product with name ${createProductDto.name} already exists`
      );
    }

    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto
  ): Promise<Product> {
    const product = await this.findOneAvailable(id);

    // Validate price if provided
    if (updateProductDto.price !== undefined && updateProductDto.price <= 0) {
      throw new BadRequestException("Product price must be greater than zero");
    }

    // Check for duplicate name if name is being updated
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const existingProduct = await this.productRepository.findOne({
        where: { name: updateProductDto.name },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Product with name ${updateProductDto.name} already exists`
        );
      }
    }

    const updatedProduct = this.productRepository.merge(
      product,
      updateProductDto
    );
    return this.productRepository.save(updatedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOneAvailable(id);

    // Check if product is in any active orders (not delivered or cancelled)
    const activeOrders = await this.orderRepository
      .createQueryBuilder("order")
      .innerJoin("order.products", "product")
      .where("product.id = :productId", { productId: id })
      .andWhere("order.status IN (:...activeStatuses)", {
        activeStatuses: [
          OrderStatus.PENDING,
          OrderStatus.PREPARING,
          OrderStatus.READY,
        ],
      })
      .getCount();

    if (activeOrders > 0) {
      throw new ConflictException(
        "Cannot delete product that is in active orders"
      );
    }

    product.isAvailable = false;
    await this.productRepository.save(product);
  }

  async permanentlyRemove(id: string): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }
}
