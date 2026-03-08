import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashSale } from '../../entities/flash-sale.entity';
import { ItemModule } from '../item/item.module';
import { FlashSaleController } from './flash-sale.controller';
import { FlashSaleRepository } from './flash-sale.repository';
import { FlashSaleService } from './flash-sale.service';

@Module({
  imports: [TypeOrmModule.forFeature([FlashSale]), ItemModule],
  controllers: [FlashSaleController],
  providers: [FlashSaleService, FlashSaleRepository],
  exports: [FlashSaleService, FlashSaleRepository],
})
export class FlashSaleModule {}
