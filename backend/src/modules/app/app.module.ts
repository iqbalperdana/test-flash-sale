import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '../../common/configs/database.config';
import { FlashSaleModule } from '../flash-sale/flash-sale.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';
import { OrderModule } from '../order/order.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config) => ({ ...config }),
    }),
    ItemModule,
    InventoryModule,
    FlashSaleModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
