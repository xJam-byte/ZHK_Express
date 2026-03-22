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
  complexId: number | null;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
}

export const fetchMe = (): Promise<UserProfile> =>
  api.get("/auth/me").then((r) => r.data);

export const saveUserAddress = (data: {
  complexId: number;
  entrance: string;
  floor: string;
  apartment: string;
  comment?: string;
}) => api.patch("/auth/address", data).then((r) => r.data);

// --- Complexes ---
export interface ResidentialComplex {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export const fetchComplexes = (): Promise<ResidentialComplex[]> =>
  api.get("/complexes").then((r) => r.data);

export const resolveGeoComplex = (
  latitude: number,
  longitude: number,
): Promise<{
  complex: ResidentialComplex;
  distance: number;
  outOfRange?: boolean;
}> =>
  api
    .post("/complexes/resolve-geo", { latitude, longitude })
    .then((r) => r.data);

// --- Products ---
export const fetchProducts = () => api.get("/products").then((r) => r.data);

export const fetchAllProducts = () =>
  api.get("/products/all").then((r) => r.data);

export const updateProduct = (
  id: number,
  data: { price?: number; stock?: number; name?: string },
) => api.patch(`/products/${id}`, data).then((r) => r.data);

export const toggleProduct = (id: number, isActive: boolean) =>
  api.patch(`/products/${id}/toggle`, { isActive }).then((r) => r.data);

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

export const fetchOrderHistory = () =>
  api.get("/orders?history=true").then((r) => r.data);

export const fetchOrderById = (id: number) =>
  api.get(`/orders/${id}`).then((r) => r.data);

export const updateOrderStatus = (id: number, status: string) =>
  api.patch(`/orders/${id}/status`, { status }).then((r) => r.data);

// --- Admin Dashboard ---
export interface DashboardData {
  totalRevenue: number;
  totalDeliveryFees: number;
  platformFee: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  activeOrders: number;
  averageOrderAmount: number;
  totalClients: number;
  activeShops: number;
  suspendedShops: number;
  shops: ShopStats[];
}

export interface ShopStats {
  id: number;
  name: string;
  isActive: boolean;
  revenue: number;
  deliveredOrderCount: number;
  activeOrderCount: number;
  totalProducts: number;
  totalOrders: number;
  owner: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
}

export const fetchDashboard = (): Promise<DashboardData> =>
  api.get("/admin/dashboard").then((r) => r.data);

// --- Admin Shops ---
export const fetchShops = () =>
  api.get("/admin/shops").then((r) => r.data);

export const suspendShop = (id: number) =>
  api.patch(`/admin/shops/${id}/suspend`).then((r) => r.data);

export const resumeShop = (id: number) =>
  api.patch(`/admin/shops/${id}/resume`).then((r) => r.data);

export default api;
