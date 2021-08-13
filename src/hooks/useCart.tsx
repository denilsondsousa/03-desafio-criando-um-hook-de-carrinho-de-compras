import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const productInCart = cart.find((product)=> product.id === productId);

      const stockResponse = await api.get(`stock/${productId}`);
      const stock: Stock = stockResponse.data;

      const productAmount = productInCart ? productInCart.amount : 0.

      if(stock.amount < productAmount + 1){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let updatedCart = []
      if(productInCart){
        updatedCart = cart.map(product => product.id === productId ?
          ({
            ...productInCart,
            amount: productInCart.amount + 1
          }) : product);

        setCart(updatedCart);     
      }else{
        const productResponse = await api.get(`/products/${productId}`);

        const newProduct: Product = productResponse.data;

        updatedCart = [...cart, {...newProduct, amount: 1}]
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(productIndex => productIndex.id === productId)

      if(!(productIndex>0)){
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = [...cart.slice(0, productIndex), ...cart.slice(productIndex + 1)]
      
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const responseStock = await api.get(`/stock/${productId}`);
      const stock: Stock = responseStock.data;

      const productInCart = cart.find((product)=> product.id === productId) as Product;
            
      if(stock.amount <= amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;     
      } 

      if(amount < 1){
        return;
      }

      const updatedCart = cart.map((product) => product.id === productId ? 
      ({...productInCart, amount}) : product);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
     toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
