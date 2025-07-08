import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}