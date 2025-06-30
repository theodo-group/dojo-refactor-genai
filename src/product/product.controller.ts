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
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "../entities/product.entity";
import { ParseUUIDPipe } from "../common/pipes/parse-uuid.pipe";

@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(
    @Query("category") category?: string,
    @Query("available") available?: string,
    @Query("sort") sort?: string,
    @Query("price_min") priceMin?: string,
    @Query("price_max") priceMax?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ): Promise<Product[]> {
    const availableBool =
      available === "false" ? false : available === "true" ? true : undefined;
    const priceMinNum = priceMin ? parseFloat(priceMin) : undefined;
    const priceMaxNum = priceMax ? parseFloat(priceMax) : undefined;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : undefined;

    return this.productService.findAll(
      category,
      availableBool,
      sort,
      priceMinNum,
      priceMaxNum,
      search,
      limitNum,
      offsetNum
    );
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Product> {
    return this.productService.findOneAvailable(id);
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.create(createProductDto);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<Product> {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.productService.remove(id);
  }
}
