import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OrderCheckoutDto {
  @IsNumber()
  @IsNotEmpty()
  flashSaleId: number;

  @IsString()
  @IsNotEmpty()
  userEmail: string;
}
