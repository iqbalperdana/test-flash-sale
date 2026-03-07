import api from '../api/axios';

export interface Item {
  id: number;
  title: string;
  price: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchItemsData = async (): Promise<Item[]> => {
  const response = await api.get('/items');
  return response.data;
};

export const getItemById = async (id: number): Promise<Item> => {
  const response = await api.get(`/items/${id}`);
  return response.data;
};

export const createItem = async (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
  const response = await api.post('/items', data);
  return response.data;
};

export const updateItem = async (id: number, data: Partial<Item>) => {
  const response = await api.put(`/items/${id}`, data);
  return response.data;
};

export const deleteItem = async (id: number) => {
  const response = await api.delete(`/items/${id}`);
  return response.data;
};
