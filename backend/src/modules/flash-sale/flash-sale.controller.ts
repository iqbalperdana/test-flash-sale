import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSaleService } from './flash-sale.service';

@Controller('api/v1/flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  @Post()
  create(@Body() createFlashSaleDto: CreateFlashSaleDto) {
    return this.flashSaleService.create(createFlashSaleDto);
  }

  @Get()
  findAll() {
    return this.flashSaleService.findAll();
  }

  @Get('public/list')
  findPublic() {
    return this.flashSaleService.findPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flashSaleService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
  ) {
    return this.flashSaleService.update(+id, updateFlashSaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flashSaleService.remove(+id);
  }
}
