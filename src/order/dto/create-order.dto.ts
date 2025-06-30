import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsBoolean,
} from "class-validator";

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID("4", { each: true })
  productIds: string[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // Advanced loyalty features
  @IsOptional()
  @IsNumber()
  @Min(0)
  usePoints?: number;

  @IsOptional()
  @IsUUID()
  referredBy?: string;

  @IsOptional()
  @IsBoolean()
  isBirthdayOrder?: boolean;

  @IsOptional()
  @IsString()
  groupOrderId?: string;
}
