import api from "../api/axios";

export const apiUrlOrders = "/v1/orders";

export const placeFlashSaleOrder = async (data: {
  userEmail: string;
  flashSaleId: number;
  quantity: number;
}) => {
  const response = await api.post(`${apiUrlOrders}/flash-sale`, data);
  return response.data;
};

export const fetchOrders = async () => {
  const response = await api.get(apiUrlOrders);
  return response.data;
};
