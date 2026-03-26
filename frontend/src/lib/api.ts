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
  selectedShopId: number | null;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  shopId?: number; // present for SHOP role users
}

export const fetchMe = (): Promise<UserProfile> =>
  api.get("/auth/me").then((r) => r.data);

export const saveUserAddress = (data: {
  shopId: number;
  entrance: string;
  floor: string;
  apartment: string;
  comment?: string;
}) => api.patch("/auth/address", data).then((r) => r.data);

// --- Shops Geo ---
export interface ShopInfo {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
}

export const fetchActiveShops = (): Promise<ShopInfo[]> =>
  api.get("/shops").then((r) => r.data);

export const resolveGeoShop = (
  latitude: number,
  longitude: number,
): Promise<{
  shop: ShopInfo;
  distance: number;
  outOfRange?: boolean;
}> =>
  api
    .post("/shops/resolve-geo", { latitude, longitude })
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
  promoCode?: string;
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

export const rateOrder = (id: number, rating: number, review?: string) =>
  api.patch(`/orders/${id}/rate`, { rating, review }).then((r) => r.data);

export const fetchShopReviews = (shopId: number) =>
  api.get(`/orders/shop/${shopId}/reviews`).then((r) => r.data);

export const fetchShopRating = (shopId: number): Promise<{
  averageRating: number | null;
  totalReviews: number;
  breakdown: Record<number, number>;
}> =>
  api.get(`/orders/shop/${shopId}/rating`).then((r) => r.data);

// --- Promo Codes ---
export const validatePromoCode = (code: string, orderAmount: number) =>
  api.post("/promo/validate", { code, orderAmount }).then((r) => r.data);

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
  shops: any[];
  salesTrend?: { date: string; amount: number }[];
  topProducts?: { name: string; quantity: number }[];
  slaStats?: { name: string; value: number }[];
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

export const exportOrders = () =>
  api.get("/admin/export/orders").then((r) => r.data);

// --- Admin Shops ---
export const fetchShops = () =>
  api.get("/admin/shops").then((r) => r.data);

export const suspendShop = (id: number) =>
  api.patch(`/admin/shops/${id}/suspend`).then((r) => r.data);

export const resumeShop = (id: number) =>
  api.patch(`/admin/shops/${id}/resume`).then((r) => r.data);

// --- Categories ---
export interface Category {
  id: number;
  name: string;
  nameKk?: string;
  nameEn?: string;
  imageUrl?: string;
}

export const fetchCategories = (): Promise<Category[]> =>
  api.get("/categories").then((r) => r.data);

// --- Wishlist ---
export const fetchWishlist = () =>
  api.get("/wishlist").then((r) => r.data);

export const toggleWishlistItem = (productId: number) =>
  api.post(`/wishlist/${productId}/toggle`).then((r) => r.data);

export default api;
