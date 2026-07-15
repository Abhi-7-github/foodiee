import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFoodItems, placeOrder } from '../api';
import kareLogo from '../assets/CB-KARE.jpeg';
import innovateKareLogo from '../assets/innovate-kare-logo.svg';

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `₹${n}`;
};

const VegMark = ({ isVeg }) => {
  const tone = isVeg ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600';
  const dot = isVeg ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <span className={`inline-grid h-4.5 w-4.5 place-items-center rounded-[4px] border bg-white ${tone}`} aria-label={isVeg ? 'Veg' : 'Non-veg'}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
    </span>
  );
};

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-700">
    <path d="M12 2l2.92 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l7.08-1.01L12 2z" />
  </svg>
);

const Dashboard = () => {
  const { team, token, cart, setCart, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  // Food catalog state
  const [foods, setFoods] = useState([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodsError, setFoodsError] = useState('');
  
  // Search & filter states
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'veg', 'nonveg', or ''
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'bestseller'
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'price-low', 'price-high'

  // Fetch foods on mount
  useEffect(() => {
    let active = true;
    const loadFoods = async () => {
      try {
        setFoodsLoading(true);
        setFoodsError('');
        const data = await fetchFoodItems();
        if (active) {
          setFoods(data.foodItems || []);
        }
      } catch (err) {
        if (active) {
          setFoodsError('Failed to retrieve delicacies from the database.');
        }
      } finally {
        if (active) {
          setFoodsLoading(false);
        }
      }
    };
    loadFoods();
    return () => {
      active = false;
    };
  }, []);

  const addOne = (id) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
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

  // Compile cart summaries
  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, val) => sum + val, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const itemObj = foods.find((f) => String(f._id) === id);
      return sum + (itemObj?.price || 0) * qty;
    }, 0);
  }, [cart, foods]);

  // Swiggy filtering & sorting logic
  const filteredFoods = useMemo(() => {
    let result = foods.filter((f) => {
      // 1. Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const nameMatch = f.name?.toLowerCase().includes(q);
        const descMatch = f.description?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }
      // 2. Veg / Non-Veg type filter
      const isVeg = f.isVeg !== false;
      if (typeFilter === 'veg' && !isVeg) return false;
      if (typeFilter === 'nonveg' && isVeg) return false;
      
      // 3. Bestseller
      if (activeFilter === 'bestseller' && !f.isBestseller) return false;
      
      return true;
    });

    // 4. Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 4.2) - (a.rating || 4.2)); // default mock rating backfill
    }

    return result;
  }, [foods, query, typeFilter, activeFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-800 font-sans pb-24">
      
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
            <button className="bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-sm cursor-not-allowed select-none">
              Home
            </button>
            <button 
              onClick={() => navigate('/orders')}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
            >
              Orders
            </button>
            <button 
              onClick={() => navigate('/cart')}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 relative cursor-pointer"
            >
              Cart
              {cartCount > 0 && (
                <span className="ml-1.5 bg-[#ff1b76] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>
            
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-6 py-2.5 border border-[#e2e8f0] hover:bg-[#fff0f6] rounded-full text-sm font-semibold text-[#2d3748] transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>

            <div className="px-6 py-2.5 border border-[#e2e8f0] rounded-full text-sm font-bold text-[#2d3748] bg-white select-none">
              {team?.teamName || 'CB-KARE Team'}
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">

        {/* --- DYNAMIC FOOD BROWSER FLOW --- */}
        <div className="space-y-6">
          
          {/* Swiggy 1. Search Bar */}
          <div className="flex w-full items-stretch overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm max-w-xl mx-auto">
            <label className="flex w-full items-center px-5 py-2.5">
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for any dishes (e.g. Biryani, Pizza...)"
              />
            </label>
            <button
              type="button"
              className="grid w-14 place-items-center bg-[#ff1b76] hover:bg-[#e21163] text-white transition-all cursor-pointer"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2.5" />
                <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Swiggy 2. Sort & Filters Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* Veg dishes Pill */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'veg' ? '' : 'veg')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                typeFilter === 'veg'
                  ? 'border-[#ff1b76] bg-[#ff1b76]/10 text-[#ff1b76]'
                  : 'border-slate-250 bg-white text-slate-700 hover:border-slate-350'
              }`}
            >
              Veg Dishes
            </button>

            {/* Non-Veg dishes Pill */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'nonveg' ? '' : 'nonveg')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                typeFilter === 'nonveg'
                  ? 'border-[#ff1b76] bg-[#ff1b76]/10 text-[#ff1b76]'
                  : 'border-slate-250 bg-white text-slate-700 hover:border-slate-350'
              }`}
            >
              Non-Veg
            </button>
          </div>

          {/* Database error display */}
          {foodsError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-xs font-semibold text-red-700">
              {foodsError}
            </div>
          )}

          {/* Foods list grid container */}
          {foodsLoading ? (
            <div className="bg-white rounded-2xl p-16 text-center text-slate-550 border border-slate-150">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76] mx-auto mb-3"></div>
              Loading cafeteria delicacies...
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-150 font-bold text-sm text-slate-500">
              No dishes found matching your current filter selections.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredFoods.map((food) => {
                const itemIsVeg = food.isVeg !== false;
                const qty = cart[food._id] || 0;
                
                // Formatted rating label
                const rating = food.rating || 4.2;
                const ratingCountStr = (rating > 4.5) ? '100+' : '50+';

                return (
                  <article
                    key={food._id}
                    className="bg-white border border-slate-205 rounded-2xl p-5 flex justify-between gap-5 hover:shadow-md transition duration-200 relative"
                  >
                    
                    {/* Left half: item properties */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        
                        {/* Veg indicator & Bestseller tags */}
                        <div className="flex items-center gap-2">
                          <VegMark isVeg={itemIsVeg} />
                          {food.isBestseller && (
                            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black px-2 py-0.5 uppercase tracking-wide">
                              Bestseller
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 capitalize">
                            {food.category || 'General'}
                          </span>
                        </div>

                        {/* Heading */}
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                          {food.name}
                        </h3>

                        {/* Description */}
                        {food.description && (
                          <p className="text-xs text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                            {food.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {/* Rating row */}
                        <div className="inline-flex items-center gap-1 bg-emerald-50/70 border border-emerald-100/70 text-emerald-805 text-[11px] font-bold px-2 py-0.5 rounded-lg w-fit">
                          <StarIcon />
                          <span>{rating.toFixed(1)} ({ratingCountStr})</span>
                        </div>

                        {/* Pricing */}
                        <div className="text-base font-black text-slate-900 pt-0.5">
                          {formatMoney(food.price)}
                        </div>
                      </div>

                    </div>

                    {/* Right half: food item photo with overlapping Swiggy add button */}
                    <div className="relative w-32 shrink-0 flex flex-col items-center select-none pt-2">
                      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 shadow-xs relative">
                        <img
                          className="h-full w-full object-cover"
                          src={food.image}
                          alt={food.name}
                          onError={(e) => { e.target.src = 'https://placehold.co/128x128?text=Food' }}
                        />
                      </div>
                      
                      {/* Overlapping swiggy add/adjust pill button */}
                      <div className="absolute -bottom-3 inset-x-0 mx-auto w-24">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addOne(food._id)}
                            className="w-full bg-white hover:bg-slate-50 text-[#ff1b76] font-black text-xs py-2 rounded-lg border border-pink-100 shadow-md hover:shadow-lg transition-all text-center uppercase tracking-wider cursor-pointer active:scale-95 duration-100"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="w-full bg-white text-[#ff1b76] font-black text-xs py-2 rounded-lg border border-pink-100 shadow-md flex items-center justify-between px-2">
                            <button
                              type="button"
                              onClick={() => removeOne(food._id)}
                              className="px-1 text-slate-500 hover:text-slate-800 font-extrabold text-[15px] cursor-pointer"
                            >
                              −
                            </button>
                            <span>{qty}</span>
                            <button
                              type="button"
                              onClick={() => addOne(food._id)}
                              className="px-1 text-slate-500 hover:text-slate-800 font-extrabold text-[15px] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 font-bold block text-center mt-4">
                          Customisable
                        </span>
                      </div>
                    </div>

                  </article>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Floating Bottom Cart Summary (If items are chosen) */}
      {cartCount > 0 && (
        <div id="bottom-cart-summary" className="fixed bottom-0 inset-x-0 z-35 bg-white/95 backdrop-blur-md border-t border-pink-100 shadow-lg px-4 py-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Cart count: <span className="text-[#ff1b76]">{cartCount} items</span>
              </p>
              <p className="text-xs text-slate-500 font-semibold">
                Subtotal: <span className="text-[#ff1b76] font-bold">{formatMoney(cartSubtotal)}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold text-xs px-6 py-2.5 rounded-full cursor-pointer shadow-md transition"
            >
              View Cart & Checkout
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
