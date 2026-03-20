import axios from "axios";
import { getInitData } from "./telegram";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://sariah-unburnt-uncoarsely.ngrok-free.dev";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

// Attach Telegram initData and ngrok bypass header to every request
api.interceptors.request.use((config) => {
  const initData = getInitData();
  if (initData) {
    config.headers["X-Telegram-Init-Data"] = initData;
  }
  // Skip ngrok free tier interstitial "Visit Site" page
  config.headers["ngrok-skip-browser-warning"] = "true";
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Произошла ошибка";

    console.error("[API Error]", {
      url: error.config?.url,
      status: error.response?.status,
      message,
    });

    return Promise.reject(error);
  },
);

// --- Auth ---
export interface UserProfile {
  id: number;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: "CLIENT" | "SHOP" | "ADMIN";
  address: string | null;
}

export const fetchMe = (): Promise<UserProfile> =>
  api.get("/auth/me").then((r) => r.data);

// --- Products ---
export const fetchProducts = () => api.get("/products").then((r) => r.data);

export const importProducts = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/products/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// --- Orders ---
export interface CreateOrderPayload {
  items: { productId: number; quantity: number }[];
  entrance: string;
  floor: string;
  apartment: string;
  comment?: string;
}

export const createOrder = (data: CreateOrderPayload) =>
  api.post("/orders", data).then((r) => r.data);

export const fetchOrders = () => api.get("/orders").then((r) => r.data);

export const updateOrderStatus = (id: number, status: string) =>
  api.patch(`/orders/${id}/status`, { status }).then((r) => r.data);

export default api;
