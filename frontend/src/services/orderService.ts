import api from "../api/axios";

export const apiUrlOrders = "/v1/orders";

export interface OrderResult {
  token: string;
  jobId: string;
  message: string;
}

export interface JobStatus {
  status: "active" | "waiting" | "completed" | "failed" | "delayed";
  result?: {
    success: boolean;
    orderId: number;
  };
}

export const acquireToken = async (
  flashSaleId: number,
  userEmail: string,
): Promise<OrderResult> => {
  const response = await api.post(`${apiUrlOrders}/acquire-token`, {
    flashSaleId,
    userEmail,
  });
  return response.data;
};

export const getOrderStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await api.get(`${apiUrlOrders}/status/${jobId}`);
  return response.data;
};

export const fetchAllOrders = async () => {
  const response = await api.get(apiUrlOrders);
  return response.data;
};
