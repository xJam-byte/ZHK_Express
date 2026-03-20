import { create } from 'zustand';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: { id: number; name: string; price: number; imageUrl?: string }) => void;
  removeItem: (productId: number) => void;
  decrementItem: (productId: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
  getItemQuantity: (productId: number) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product) => {
    set((state) => {
      const existingIdx = state.items.findIndex(
        (item) => item.productId === product.id,
      );

      if (existingIdx >= 0) {
        const updated = [...state.items];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: 1,
          },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  decrementItem: (productId) => {
    set((state) => {
      const item = state.items.find((i) => i.productId === productId);
      if (!item) return state;

      if (item.quantity <= 1) {
        return {
          items: state.items.filter((i) => i.productId !== productId),
        };
      }

      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      };
    });
  },

  clearCart: () => set({ items: [] }),

  totalAmount: () => {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  },

  totalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getItemQuantity: (productId) => {
    const item = get().items.find((i) => i.productId === productId);
    return item?.quantity || 0;
  },
}));
