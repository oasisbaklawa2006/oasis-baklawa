import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartLine = {
  productId: string;
  productName: string;
  quantity: number;
  minimumOrderQuantity: number;
  orderIncrement: number;
  uom: string;
  unitPrice: number;
  currency: string;
};

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  addProduct: (line: Omit<CartLine, 'quantity'>) => void;
  increase: (productId: string) => void;
  decrease: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'oasis.mobile.cart.v1';
const CartContext = createContext<CartContextValue | null>(null);

function normaliseLine(line: CartLine): CartLine {
  const minimum = Math.max(1, line.minimumOrderQuantity);
  const increment = Math.max(1, line.orderIncrement);
  const quantity = Math.max(minimum, line.quantity);
  return { ...line, minimumOrderQuantity: minimum, orderIncrement: increment, quantity };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as CartLine[];
        setLines(parsed.map(normaliseLine));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => undefined);
  }, [hydrated, lines]);

  const addProduct = useCallback((line: Omit<CartLine, 'quantity'>) => {
    setLines((current) => {
      if (current.some((item) => item.productId === line.productId)) return current;
      return [...current, normaliseLine({ ...line, quantity: line.minimumOrderQuantity })];
    });
  }, []);

  const increase = useCallback((productId: string) => {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: line.quantity + line.orderIncrement }
          : line,
      ),
    );
  }, []);

  const decrease = useCallback((productId: string) => {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.max(line.minimumOrderQuantity, line.quantity - line.orderIncrement) }
          : line,
      ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, hydrated, addProduct, increase, decrease, remove, clear }),
    [addProduct, clear, decrease, hydrated, increase, lines, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
