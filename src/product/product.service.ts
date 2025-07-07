import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll(category?: string, available?: boolean): Promise<Product[]> {
    const whereCondition: any = {};
    
    if (category) {
      whereCondition.category = category;
    }
    
    if (available !== undefined) {
      whereCondition.isAvailable = available;
    } else {
      // Default behavior: only show available products
      whereCondition.isAvailable = true;
    }
    
    return this.productRepository.find({ where: whereCondition });
  }

  async findOne(id: string): Promise<Product> {
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
      throw new BadRequestException('Product price must be greater than zero');
    }
    
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const updatedProduct = this.productRepository.merge(product, updateProductDto);
    return this.productRepository.save(updatedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
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