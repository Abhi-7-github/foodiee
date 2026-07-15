import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFoodItems, placeOrder, fetchPaymentConfig } from '../api';
import kareLogo from '../assets/CB-KARE.jpeg';
import innovateKareLogo from '../assets/innovate-kare-logo.svg';

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const VegMark = ({ isVeg }) => {
  const tone = isVeg ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600';
  const dot = isVeg ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <span className={`inline-grid h-4 w-4 place-items-center rounded-[4px] border bg-white ${tone}`} aria-label={isVeg ? 'Veg' : 'Non-veg'}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
};

const Cart = () => {
  const { team, token, cart, setCart, logout } = useAuth();
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [errorSec, setErrorSec] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load foods to map details
  useEffect(() => {
    let active = true;
    const loadFoodsList = async () => {
      try {
        setFoodsLoading(true);
        const data = await fetchFoodItems();
        if (active) {
          setFoods(data.foodItems || []);
        }
      } catch (err) {
        if (active) {
          setErrorSec('Failed to load menu items details.');
        }
      } finally {
        if (active) {
          setFoodsLoading(false);
        }
      }
    };
    loadFoodsList();
    return () => {
      active = false;
    };
  }, []);

  const addOne = (id) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeOne = (id) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  const removeItem = (id) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  // Compile cart details
  const cartItemsDetails = useMemo(() => {
    const details = [];
    if (foods.length === 0) return details;
    
    Object.entries(cart).forEach(([id, qty]) => {
      const foodItem = foods.find((f) => String(f._id) === id);
      if (foodItem && qty > 0) {
        const mrp = Math.round(foodItem.price * 1.5);
        details.push({
          ...foodItem,
          qty,
          mrp,
          itemTotalMRP: mrp * qty,
          itemTotalSelling: foodItem.price * qty,
        });
      }
    });
    return details;
  }, [cart, foods]);

  // Pricing calculations
  const totalItemCount = useMemo(() => {
    return cartItemsDetails.reduce((sum, item) => sum + item.qty, 0);
  }, [cartItemsDetails]);

  const totalMRP = useMemo(() => {
    return cartItemsDetails.reduce((sum, item) => sum + item.itemTotalMRP, 0);
  }, [cartItemsDetails]);

  const totalSelling = useMemo(() => {
    return cartItemsDetails.reduce((sum, item) => sum + item.itemTotalSelling, 0);
  }, [cartItemsDetails]);

  const totalDiscount = useMemo(() => {
    return totalMRP - totalSelling;
  }, [totalMRP, totalSelling]);

  const handleCartCheckout = () => {
    if (cartItemsDetails.length === 0) return;
    const itemsToSubmit = cartItemsDetails.map((it) => ({
      foodItemId: it._id,
      name: it.name,
      price: it.price,
      quantity: it.qty,
    }));
    navigate('/payment', {
      state: {
        items: itemsToSubmit,
        totalAmount: totalSelling,
        isCartCheckout: true
      }
    });
  };

  const handleSingleQuickBuy = (foodItem, quantity) => {
    const orderItem = {
      foodItemId: foodItem._id,
      name: foodItem.name,
      price: foodItem.price,
      quantity,
    };
    navigate('/payment', {
      state: {
        items: [orderItem],
        totalAmount: foodItem.price * quantity,
        isCartCheckout: false,
        removeFoodId: foodItem._id
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-800 font-sans pb-20">
      
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={kareLogo} className="h-full w-full object-cover" alt="KARE Logo" />
            </div>
            <img src={innovateKareLogo} className="h-9 object-contain" alt="Innovate Kare Logo" />
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/orders')}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
            >
              Orders
            </button>
            <button className="bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full cursor-not-allowed shadow-sm select-none">
              Cart ({totalItemCount})
            </button>
            
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-6 py-2.5 border border-[#e2e8f0] hover:bg-[#fff0f6] rounded-full text-sm font-semibold text-[#2d3748] transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>

            <div className="px-6 py-2.5 border border-[#e2e8f0] rounded-full text-sm font-bold text-[#2d3748] bg-white select-none">
              {team?.teamName || 'Team'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {errorSec && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">{errorSec}</p>
          </div>
        )}

        {foodsLoading ? (
          <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-100 shadow-xl max-w-2xl mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76] mx-auto mb-3"></div>
            Loading shopping cart details...
          </div>
        ) : cartItemsDetails.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-xl max-w-2xl mx-auto">
            <p className="text-lg font-black text-slate-900">Your cart is empty!</p>
            <p className="text-xs text-slate-400 mt-2">Add items to it now to build your order basket.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold text-sm px-8 py-3 rounded-full cursor-pointer transition shadow-md shadow-pink-500/10"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-200">
              
              {/* List header banner */}
              <div className="px-6 py-4 flex items-center justify-between">
                <h1 className="text-base font-bold text-slate-900">
                  FOODIEE Cart ({cartItemsDetails.length} items)
                </h1>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  Fast Kitchen Service Active
                </span>
              </div>

              {/* Cart item cards */}
              {cartItemsDetails.map((item) => {
                const discountPercent = 33; // calculated from mrp = price * 1.5 (Selling is always 33% off MRP)
                return (
                  <div key={item._id} className="p-6 flex flex-col md:flex-row gap-6 items-start justify-between">
                    
                    {/* Item core layout */}
                    <div className="flex gap-6 items-start min-w-0 flex-1">
                      {/* Image block and Quantity selector combo */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="h-20 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=Food' }}
                          />
                        </div>
                        
                        {/* Selector control row: decrement / qty / increment */}
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            onClick={() => removeOne(item._id)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-50 font-black cursor-pointer text-sm"
                          >
                            −
                          </button>
                          <span className="px-3 text-xs font-extrabold text-slate-800">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => addOne(item._id)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-50 font-black cursor-pointer text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Detail info text column */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <VegMark isVeg={item.isVeg !== false} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category || 'General'}</span>
                        </div>
                        <h2 className="text-[15px] font-bold text-slate-900 truncate leading-snug">{item.name}</h2>
                        
                        {/* Pricing details row removed */}

                        <p className="text-[11px] text-slate-400 font-semibold pt-1">
                          Delivery in 15-20 mins
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row for that item */}
                    <div className="flex items-center gap-4 shrink-0 font-bold text-xs pt-4 md:pt-0">
                      <button
                        onClick={() => removeItem(item._id)}
                        className="text-slate-505 hover:text-red-500 uppercase tracking-wider border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => handleSingleQuickBuy(item, item.qty)}
                        className="text-[#ff1b76] hover:text-white uppercase tracking-wider border border-[#ff1b76]/20 bg-pink-50 hover:bg-[#ff1b76] px-4 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Buy
                      </button>
                    </div>

                  </div>
                );
              })}

              {/* Bottom footer bar with sticky layout option (Flipkart footer style) */}
              <div className="px-6 py-4 bg-white flex items-center justify-end border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-lg">
                <button
                  onClick={handleCartCheckout}
                  className="bg-[#ff1b76] hover:bg-[#e21163] text-white font-extrabold text-xs uppercase tracking-wider px-8 py-3.5 rounded-lg cursor-pointer transition shadow-md shadow-pink-500/10"
                >
                  Buy
                </button>
              </div>

          </div>
        )}
      </main>

    </div>
  );
};

export default Cart;
