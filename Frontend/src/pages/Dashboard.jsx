import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFoodItems } from '../api';
import innovateKareLogo from '../assets/Logo.png';

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



const Dashboard = () => {
  const { team, cart, setCart, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Food catalog state
  const [foods, setFoods] = useState([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodsError, setFoodsError] = useState('');
  
  // Search & filter states
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'veg', 'nonveg', or ''
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'price-low', 'price-high'

  // Static filters (for ESLint compliance)
  const rateFilter = false;
  const activeFilter = 'all';

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
      } catch {
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
    setCart((prev) => {
      const total = Object.values(prev).reduce((sum, val) => sum + val, 0);
      if (total >= 6) {
        alert('You can only select up to 6 items at a time.');
        return prev;
      }
      return {
        ...prev,
        [id]: (prev[id] || 0) + 1
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
      
      // 3. Bestseller / Offers filter
      if (activeFilter === 'bestseller' && !f.isBestseller) return false;

      // 4. Rated 4+
      if (rateFilter && (f.rating || 4.2) < 4.0) return false;
      
      return true;
    });

    // 6. Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 4.2) - (a.rating || 4.2)); // default mock rating backfill
    }

    return result;
  }, [foods, query, typeFilter, activeFilter, rateFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#F7E8CC] text-[#3B1D14] font-sans pb-24 transition-colors duration-300">
      
      {/* Top Header Navbar */}
      <header className="bg-[#FFF6E5] border-b border-[#EED9B7] sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={innovateKareLogo} className="h-14 w-auto object-contain" alt="Logo" />
            </div>

            {/* Desktop Menu Navbar (Tablet/Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <button className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full shadow-sm cursor-not-allowed select-none transition">
                Home
              </button>
              <button 
                onClick={() => navigate('/orders')}
                className="text-[#3B1D14] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer"
              >
                Orders
              </button>
              <button 
                onClick={() => navigate('/cart')}
                className="text-[#3B1D14] hover:text-[#C96F42] text-sm font-semibold transition duration-150 relative cursor-pointer"
              >
                Cart
                {cartCount > 0 && (
                  <span className="ml-1.5 bg-[#C96F42] text-[#FFF8ED] text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-6 py-2.5 border border-[#EED9B7] hover:bg-[#F7E8CC] rounded-full text-sm font-semibold text-[#3B1D14] transition duration-150 disabled:opacity-50 cursor-pointer bg-[#FFF6E5]"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>

              <div className="px-6 py-2.5 border border-[#D9B58C] rounded-full text-sm font-bold text-[#C96F42] bg-[#FFF2DA] select-none">
                {team?.teamName || 'CB-KARE Team'}
              </div>
            </div>

            {/* Hamburger Button (Mobile) */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                type="button"
                className="text-[#3B1D14] hover:text-[#C96F42] focus:outline-none p-1.5 border border-[#EED9B7] rounded-xl hover:bg-[#F7E8CC] transition cursor-pointer bg-[#FFF6E5]"
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
              <button className="w-full bg-[#C96F42] text-[#FFF8ED] font-bold text-sm py-2.5 rounded-xl shadow-sm text-center cursor-not-allowed select-none">
                Home
              </button>
              <button 
                onClick={() => { setMenuOpen(false); navigate('/orders'); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer"
              >
                Orders
              </button>
              <button 
                onClick={() => { setMenuOpen(false); navigate('/cart'); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer relative"
              >
                Cart
                {cartCount > 0 && (
                  <span className="ml-1.5 bg-[#C96F42] text-[#FFF8ED] text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                disabled={loggingOut}
                className="w-full py-2.5 border border-[#EED9B7] hover:bg-[#F7E8CC] rounded-xl text-sm font-bold text-[#3B1D14] transition text-center disabled:opacity-50 cursor-pointer bg-[#FFF6E5]"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>

              <div className="w-full py-2.5 border border-[#D9B58C] rounded-xl text-sm font-black text-[#C96F42] bg-[#FFF2DA] select-none text-center">
                {team?.teamName || 'CB-KARE Team'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">

        {/* --- DYNAMIC FOOD BROWSER FLOW --- */}
        <div className="space-y-6">
          
          {/* Swiggy 1. Search Bar */}
          <div className="flex w-full items-stretch overflow-hidden rounded-full border border-[#EED9B7] bg-[#FFF6E5] shadow-xs max-w-xl mx-auto">
            <label className="flex w-full items-center px-5 py-2.5">
              <input
                className="w-full bg-transparent text-sm text-[#3B1D14] outline-none placeholder:text-[#8A6858]/60 font-semibold"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for any dishes (e.g. Biryani, Pizza...)"
              />
            </label>
            <button
              type="button"
              className="grid w-14 place-items-center bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] transition-all cursor-pointer font-bold"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2050/svg">
                <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2.5" />
                <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Swiggy 2. Sort & Filters Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* Veg Dishes Pill */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'veg' ? '' : 'veg')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                typeFilter === 'veg'
                  ? 'border-[#C96F42] bg-[#FFF2DA] text-[#C96F42]'
                  : 'border-[#EED9B7] bg-[#FFF6E5] text-[#8A6858] hover:bg-[#F7E8CC]'
              }`}
            >
              Veg
            </button>

            {/* Non-Veg dishes Pill */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'nonveg' ? '' : 'nonveg')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                typeFilter === 'nonveg'
                  ? 'border-[#C96F42] bg-[#FFF2DA] text-[#C96F42]'
                  : 'border-[#EED9B7] bg-[#FFF6E5] text-[#8A6858] hover:bg-[#F7E8CC]'
              }`}
            >
              Non-Veg
            </button>

            {/* Price: Low to High Pill */}
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'price-low' ? 'rating' : 'price-low')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                sortBy === 'price-low'
                  ? 'border-[#C96F42] bg-[#FFF2DA] text-[#C96F42]'
                  : 'border-[#EED9B7] bg-[#FFF6E5] text-[#8A6858] hover:bg-[#F7E8CC]'
              }`}
            >
              Price: Low to High
            </button>

            {/* Price: High to Low Pill */}
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'price-high' ? 'rating' : 'price-high')}
              className={`shrink-0 rounded-full border px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                sortBy === 'price-high'
                  ? 'border-[#C96F42] bg-[#FFF2DA] text-[#C96F42]'
                  : 'border-[#EED9B7] bg-[#FFF6E5] text-[#8A6858] hover:bg-[#F7E8CC]'
              }`}
            >
              Price: High to Low
            </button>
          </div>

          {/* Database error display */}
          {foodsError && (
            <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg text-xs font-semibold text-red-750 shadow-xs">
              {foodsError}
            </div>
          )}

          {/* Foods list grid container */}
          {foodsLoading ? (
            <div className="bg-[#FFF6E5] rounded-[32px] p-16 text-center text-[#8A6858] border border-[#EED9B7] shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
              Loading cafeteria delicacies...
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="bg-[#FFF6E5] rounded-[32px] p-16 text-center border border-[#EED9B7] font-bold text-sm text-[#4A1F12] shadow-sm">
              No dishes found matching your current filter selections.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredFoods.map((food) => {
                const itemIsVeg = food.isVeg !== false;
                const qty = cart[food._id] || 0;

                return (
                  <article
                    key={food._id}
                    className="bg-[#FFF6E5] rounded-[32px] p-5 flex justify-between gap-4 sm:gap-5 hover:shadow-md transition duration-200 relative border border-[#EED9B7]/50"
                  >
                    
                    {/* Left half: Swiggy order of properties */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        
                        {/* Veg indicator & Bestseller tags */}
                        <div className="flex items-center gap-2">
                          <VegMark isVeg={itemIsVeg} />
                          {food.isBestseller && (
                            <span className="rounded-full bg-[#FFF2DA] text-[#B85C38] border border-[#EED9B7]/50 text-[9px] font-black px-2 py-0.5 uppercase tracking-wide">
                              Bestseller
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-[#8A6858] capitalize">
                            {food.category || 'General'}
                          </span>
                        </div>

                        {/* Title Heading */}
                        <h3 className="text-sm sm:text-base font-extrabold text-[#3B1D14] leading-snug line-clamp-2 font-serif-cafe">
                          {food.name}
                        </h3>

                        {/* Pricing */}
                        <div className="text-sm sm:text-base font-extrabold text-[#3B1D14] pt-0.5">
                          {formatMoney(food.price)}
                        </div>

                        {/* Description (at bottom) */}
                        {food.description && (
                          <p className="text-xs text-[#8A6858] font-semibold line-clamp-2 leading-relaxed">
                            {food.description}
                          </p>
                        )}
                      </div>

                    </div>

                    {/* Right half: food item photo with overlapping Swiggy add button */}
                    <div className="relative w-24 sm:w-32 shrink-0 flex flex-col items-center select-none pt-2">
                      <div className="aspect-square w-full overflow-hidden rounded-[20px] bg-[#F7E8CC]/40 border border-[#EED9B7]/40 shadow-xs relative">
                        <img
                          className="h-full w-full object-cover"
                          src={food.image}
                          alt={food.name}
                          onError={(e) => { e.target.src = 'https://placehold.co/128x128?text=Food' }}
                        />
                      </div>
                      
                      {/* Overlapping swiggy add/adjust pill button */}
                      <div className="absolute -bottom-3 inset-x-0 mx-auto w-20 sm:w-24">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addOne(food._id)}
                            className="w-full bg-white hover:bg-[#FFF8ED] text-emerald-600 font-extrabold text-[10px] sm:text-xs py-1.5 sm:py-2 rounded-xl border border-[#EED9B7] shadow-md hover:shadow-lg transition-all text-center uppercase tracking-wider cursor-pointer active:scale-95 duration-100"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="w-full bg-white text-emerald-600 font-extrabold text-[10px] sm:text-xs py-1.5 sm:py-2 rounded-xl border border-[#EED9B7] shadow-md flex items-center justify-between px-1.5 sm:px-2">
                            <button
                              type="button"
                              onClick={() => removeOne(food._id)}
                              className="px-0.5 sm:px-1 text-emerald-600 hover:text-emerald-700 font-extrabold text-[13px] sm:text-[15px] cursor-pointer"
                            >
                              −
                            </button>
                            <span className="text-emerald-600 font-black">{qty}</span>
                            <button
                              type="button"
                              onClick={() => addOne(food._id)}
                              className="px-0.5 sm:px-1 text-emerald-600 hover:text-emerald-700 font-extrabold text-[13px] sm:text-[15px] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <span className="text-[9px] text-[#8A6858]/85 font-semibold block text-center mt-4">
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
        <div id="bottom-cart-summary" className="fixed bottom-0 inset-x-0 z-35 bg-[#FFF6E5]/95 backdrop-blur-md border-t border-[#EED9B7] shadow-lg px-4 py-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-[#3B1D14]">
                Cart count: <span className="text-[#C96F42]">{cartCount} items</span>
              </p>
              <p className="text-xs text-[#8A6858]/80 font-semibold">
                Subtotal: <span className="text-[#C96F42] font-bold">{formatMoney(cartSubtotal)}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold text-xs px-6 py-2.5 rounded-full cursor-pointer shadow-md transition"
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
