import api from "../api/axios";

export interface Item {
  id: number;
  title: string;
  sku: string;
  description: string;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

export const apiUrlItems = "/v1/items";

export const fetchItemsData = async (): Promise<Item[]> => {
  const response = await api.get(apiUrlItems);
  return response.data;
};

export const getItemById = async (id: number): Promise<Item> => {
  const response = await api.get(`${apiUrlItems}/${id}`);
  return response.data;
};

export const createItem = async (
  data: Omit<Item, "id" | "createdAt" | "updatedAt">,
) => {
  const response = await api.post(apiUrlItems, data);
  return response.data;
};

export const updateItem = async (id: number, data: Partial<Item>) => {
  const response = await api.put(`${apiUrlItems}/${id}`, data);
  return response.data;
};

export const deleteItem = async (id: number) => {
  const response = await api.delete(`${apiUrlItems}/${id}`);
  return response.data;
};
