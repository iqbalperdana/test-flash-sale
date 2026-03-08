import api from "../api/axios";
import type { Item } from "./itemsService";

export interface Inventory {
  id: number;
  totalStock: number;
  availableStock: number;
  item: Item;
  createdAt?: string;
  updatedAt?: string;
}

export const apiUrlInventory = "/v1/inventory";

export const fetchInventoryData = async (): Promise<Inventory[]> => {
  const response = await api.get(apiUrlInventory);
  return response.data;
};

export const getInventoryById = async (id: number): Promise<Inventory> => {
  const response = await api.get(`${apiUrlInventory}/${id}`);
  return response.data;
};

export const createInventory = async (data: {
  itemId: number;
  totalStock: number;
  availableStock: number;
}) => {
  const response = await api.post(apiUrlInventory, data);
  return response.data;
};

export const updateInventory = async (
  id: number,
  data: { itemId?: number; totalStock?: number; availableStock?: number },
) => {
  const response = await api.put(`${apiUrlInventory}/${id}`, data);
  return response.data;
};

export const deleteInventory = async (id: number) => {
  const response = await api.delete(`${apiUrlInventory}/${id}`);
  return response.data;
};
