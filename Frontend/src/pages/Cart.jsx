import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFoodItems } from '../api';
import innovateKareLogo from '../assets/Logo.png';

const VegMark = ({ isVeg }) => {
  const tone = isVeg ? 'border-emerald-600 text-emerald-700' : 'border-red-500 text-red-650';
  const dot = isVeg ? 'bg-emerald-600' : 'bg-red-500';
  return (
    <span className={`inline-grid h-4 w-4 place-items-center rounded-[4px] border bg-white ${tone}`} aria-label={isVeg ? 'Veg' : 'Non-veg'}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
};

const Cart = () => {
  const { team, cart, setCart, logout } = useAuth();
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [errorSec, setErrorSec] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        console.error(err);
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
    setCart((prev) => {
      const total = Object.values(prev).reduce((sum, val) => sum + val, 0);
      if (total >= 6) {
        alert('You can only select up to 6 items at a time.');
        return prev;
      }
      return {
        ...prev,
        [id]: (prev[id] || 0) + 1,
      };
    });
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

  const totalSelling = useMemo(() => {
    return cartItemsDetails.reduce((sum, item) => sum + item.itemTotalSelling, 0);
  }, [cartItemsDetails]);

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
    <div className="min-h-screen bg-[#F7E8CC] text-[#3B1D14] font-sans pb-20 transition-colors duration-300">
      
      {/* Top Header Navbar */}
      <header className="bg-[#FFF6E5] border-b border-[#EED9B7] sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={innovateKareLogo} className="h-14 w-auto object-contain" alt="Logo" />
            </div>

            {/* Desktop Menu Navbar (Tablet/Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => navigate('/orders')}
                className="text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer"
              >
                Orders
              </button>
              <button className="bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full cursor-not-allowed shadow-sm select-none">
                Cart ({totalItemCount})
              </button>
              
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-6 py-2.5 border border-[#EED9B7] hover:bg-[#EED9B7]/50 rounded-full text-sm font-semibold text-[#3B1D14] transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>

              <div className="px-6 py-2.5 border border-[#EED9B7] rounded-full text-sm font-bold text-[#3B1D14] bg-[#FFF6E5] select-none">
                {team?.teamName || 'Team'}
              </div>
            </div>

            {/* Hamburger Button (Mobile) */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                type="button"
                className="text-[#3B1D14] hover:text-[#C96F42] focus:outline-none p-1.5 border border-[#EED9B7] rounded-xl hover:bg-[#F7E8CC] transition cursor-pointer"
                aria-label="Toggle menu"
              >
                {menuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Drops Menu */}
          {menuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-[#EED9B7] flex flex-col gap-2.5">
              <button 
                onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => { setMenuOpen(false); navigate('/orders'); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer"
              >
                Orders
              </button>
              <button className="w-full bg-[#C96F42] text-[#FFF8ED] font-bold text-sm py-2.5 rounded-xl shadow-sm text-center cursor-not-allowed select-none">
                Cart ({totalItemCount})
              </button>
              
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                disabled={loggingOut}
                className="w-full py-2.5 border border-[#EED9B7] hover:bg-[#F7E8CC] rounded-xl text-sm font-bold text-[#3B1D14] transition text-center disabled:opacity-50 cursor-pointer"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>

              <div className="w-full py-2.5 border border-[#D9B58C] rounded-xl text-sm font-black text-[#C96F42] bg-[#FFF2DA] select-none text-center">
                {team?.teamName || 'Team'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        {errorSec && (
          <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-sm">
            <p className="text-sm font-semibold text-red-808">{errorSec}</p>
          </div>
        )}

        {foodsLoading ? (
          <div className="bg-[#FFF6E5] rounded-3xl p-16 text-center text-[#8A6858] border border-[#EED9B7] shadow-xl max-w-2xl mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
            Loading shopping cart details...
          </div>
        ) : cartItemsDetails.length === 0 ? (
          <div className="bg-[#FFF6E5] rounded-3xl p-16 text-center border border-[#EED9B7] shadow-xl max-w-2xl mx-auto">
            <p className="text-lg font-black text-[#4A1F12] font-serif-cafe">Your cart is empty!</p>
            <p className="text-xs text-[#8A6858] mt-2">Add items to it now to build your order basket.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold text-sm px-8 py-3 rounded-full cursor-pointer transition shadow-md shadow-amber-900/10"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl shadow-md divide-y divide-[#EED9B7]/60 overflow-hidden">
              
              {/* List header banner */}
              <div className="px-6 py-4 flex items-center justify-between">
                <h1 className="text-base font-bold text-[#4A1F12] font-serif-cafe">
                  FOODIEE Cart ({cartItemsDetails.length} items)
                </h1>
                <span className="text-xs font-bold text-[#B85C38] bg-[#FFF6E5] border border-[#EED9B7] px-3 py-1 rounded-full">
                  Fast Kitchen Service Active
                </span>
              </div>

              {/* Cart item cards */}
              {cartItemsDetails.map((item) => {
                return (
                  <div key={item._id} className="p-6 flex flex-col md:flex-row gap-6 items-start justify-between">
                    
                    {/* Item core layout */}
                    <div className="flex gap-6 items-start min-w-0 flex-1">
                      {/* Image block and Quantity selector combo */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="h-20 w-20 rounded-lg overflow-hidden border border-[#EED9B7] bg-[#F7E8CC]/55 shadow-sm">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=Food' }}
                          />
                        </div>
                        
                        {/* Selector control row */}
                        <div className="flex items-center rounded-lg border border-[#EED9B7] bg-[#FFF6E5]">
                          <button
                            onClick={() => removeOne(item._id)}
                            className="px-2 py-0.5 text-[#8A6858] hover:bg-[#F7E8CC] font-black cursor-pointer text-sm"
                          >
                            −
                          </button>
                          <span className="px-3 text-xs font-extrabold text-[#3B1D14]">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => addOne(item._id)}
                            className="px-2 py-0.5 text-[#8A6858] hover:bg-[#F7E8CC] font-black cursor-pointer text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Detail info text column */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <VegMark isVeg={item.isVeg !== false} />
                          <span className="text-[10px] font-bold text-[#8A6858] uppercase tracking-wider">{item.category || 'General'}</span>
                        </div>
                        <h2 className="text-[15px] font-bold text-[#3B1D14] font-serif-cafe truncate leading-snug">{item.name}</h2>
                        
                        <p className="text-[11px] text-[#8A6858] font-semibold pt-1">
                          Delivery in 15-20 mins
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center gap-4 shrink-0 font-bold text-xs pt-4 md:pt-0">
                      <button
                        onClick={() => removeItem(item._id)}
                        className="text-[#8A6858] hover:text-red-500 uppercase tracking-wider border border-[#EED9B7] hover:border-red-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSingleQuickBuy(item, item.qty)}
                        className="text-[#C96F42] hover:text-white uppercase tracking-wider border border-[#C96F42]/20 bg-[#F7E8CC]/40 hover:bg-[#C96F42] px-4 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Buy
                      </button>
                    </div>

                  </div>
                );
              })}

              {/* Bottom footer bar */}
              <div className="px-6 py-4 bg-[#FFF6E5] flex items-center justify-end border-t border-[#EED9B7] sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-lg">
                <button
                  type="button"
                  onClick={handleCartCheckout}
                  className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-extrabold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl cursor-pointer transition shadow-md shadow-amber-900/10"
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
