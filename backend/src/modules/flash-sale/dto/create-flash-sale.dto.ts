export class CreateFlashSaleDto {
  name: string;
  startTime: Date;
  endTime: Date;
  allocatedStock?: number;
  availableStock?: number;
  maxPurchaseQty?: number;
  isActive?: boolean;
  itemId: number;
}
