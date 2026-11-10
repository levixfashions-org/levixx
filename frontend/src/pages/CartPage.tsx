import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { LevixCartIcon } from '../components/LevixCartIcon';

export const CartPage: React.FC = () => {
  const { cart, fetchCart, updateQuantity, removeItem, loading } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center space-y-4">
        <LevixCartIcon className="w-16 h-20 text-neutral-400 mx-auto opacity-60" />
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-black">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-xs text-neutral-600 max-w-sm mx-auto">
          Explore our latest collection drops and heavyweight oversized silhouettes.
        </p>
        <Link
          to="/collections/all-products"
          className="inline-block mt-4 px-8 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  const subtotalINR = (cart.subtotalPaise / 100).toLocaleString('en-IN');
  const shippingINR = (cart.shippingPaise / 100).toLocaleString('en-IN');
  const totalINR = (cart.totalPaise / 100).toLocaleString('en-IN');

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-10">
      
      <div className="border-b border-black/10 pb-6">
        <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">
          Shopping Bag ({cart.itemCount})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Items Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="divide-y divide-black/10 bg-white border border-black/10 p-6 shadow-sm">
            {cart.items.map((item) => (
              <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex items-center space-x-4">
                <div className="w-20 h-24 bg-neutral-200 overflow-hidden flex-shrink-0">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  <Link to={`/products/${item.productSlug}`} className="text-xs sm:text-sm font-bold text-black hover:underline line-clamp-1">
                    {item.productName}
                  </Link>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Size: <span className="font-bold uppercase text-black">{item.size}</span>{item.color ? <> · Colour: <span className="font-bold text-black">{item.color}</span></> : null}
                  </p>
                  <p className="text-xs font-mono font-bold text-black">
                    RS. {(item.unitPricePaise / 100).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Counter */}
                <div className="flex items-center border border-black/20 bg-white">
                  <button
                    disabled={loading || item.quantity <= 1}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1.5 hover:bg-neutral-100 disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3 text-black" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold font-mono">{item.quantity}</span>
                  <button
                    disabled={loading || item.quantity >= item.stockQuantity}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1.5 hover:bg-neutral-100 disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3 text-black" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="font-mono font-bold text-xs sm:text-sm text-black min-w-[70px] text-right">
                  RS. {(item.totalPaise / 100).toLocaleString('en-IN')}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 border border-black/10 shadow-sm space-y-6 self-start">
          <h3 className="font-display font-black text-xl uppercase tracking-tight text-black border-b border-black/10 pb-3">
            Summary
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-black">RS. {subtotalINR}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Estimated Delivery</span>
              <span className="font-mono font-semibold text-black">
                {cart.shippingPaise === 0 ? 'FREE' : `RS. ${shippingINR}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-black border-t border-black/10 pt-3">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-mono text-lg">RS. {totalINR}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
