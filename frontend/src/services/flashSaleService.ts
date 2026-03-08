import api from "../api/axios";
import type { Item } from "./itemsService";

export interface FlashSale {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  allocatedStock: number;
  availableStock: number;
  maxPurchaseQty: number;
  isActive: boolean;
  item: Item;
  createdAt?: string;
  updatedAt?: string;
}

export const apiUrlFlashSales = "/v1/flash-sales";

export const fetchFlashSalesData = async (): Promise<FlashSale[]> => {
  const response = await api.get(apiUrlFlashSales);
  return response.data;
};

export const getFlashSaleById = async (id: number): Promise<FlashSale> => {
  const response = await api.get(`${apiUrlFlashSales}/${id}`);
  return response.data;
};

export const createFlashSale = async (data: any) => {
  const response = await api.post(apiUrlFlashSales, data);
  return response.data;
};

export const updateFlashSale = async (id: number, data: any) => {
  const response = await api.put(`${apiUrlFlashSales}/${id}`, data);
  return response.data;
};

export const deleteFlashSale = async (id: number) => {
  const response = await api.delete(`${apiUrlFlashSales}/${id}`);
  return response.data;
};
