import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrders, fetchFoodItems } from '../api';
import innovateKareLogo from '../assets/Logo.png';

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const AcceptedSingleTickIcon = () => (
  <svg className="h-4.5 w-4.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RejectedCrossIcon = () => (
  <svg className="h-4.5 w-4.5 text-red-650 shrink-0" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DeliveredDoubleTickIcon = () => (
  <svg className="h-4.5 w-4.5 text-[#C96F42] shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 13l4 4L14 7" opacity="0.6" />
    <path d="M8 13l4 4L20 7" />
  </svg>
);

const InfoPendingIcon = () => (
  <svg className="h-5 w-5 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.8 2.8a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const Orders = () => {
  const { team, token, setCart, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [foods, setFoods] = useState([]);

  useEffect(() => {
    let active = true;
    const loadOrdersData = async () => {
      try {
        setLoading(true);
        setError('');
        const [ordersRes, foodsRes] = await Promise.all([
          fetchOrders(token),
          fetchFoodItems().catch(() => ({ foodItems: [] }))
        ]);
        if (active) {
          setOrders(ordersRes.orders || []);
          setFoods(foodsRes.foodItems || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to fetch orders.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (token) {
      loadOrdersData();
    } else {
      Promise.resolve().then(() => {
        setLoading(false);
      });
    }
    return () => {
      active = false;
    };
  }, [token]);

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

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleReorder = (orderItems) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      orderItems.forEach((item) => {
        if (item.foodItemId) {
          newCart[item.foodItemId] = (newCart[item.foodItemId] || 0) + item.quantity;
        }
      });
      return newCart;
    });
    alert('Items from this order have been successfully added to your cart!');
    navigate('/cart');
  };

  const handleHelp = (orderId) => {
    alert(`Need help with Order #${orderId}?\n\nPlease contact support:\n📞 Phone: 9398779899\n✉️ Email: abhiramkollepara999@gmail.com`);
  };

  const toggleDetails = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
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
                onClick={handleGoHome}
                className="text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer"
              >
                Home
              </button>
              <button className="bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full cursor-not-allowed shadow-sm select-none">
                Orders
              </button>
              <button 
                onClick={() => navigate('/cart')}
                className="text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer"
              >
                Cart
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
                onClick={() => { setMenuOpen(false); handleGoHome(); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer"
              >
                Home
              </button>
              <button className="w-full bg-[#C96F42] text-[#FFF8ED] font-bold text-sm py-2.5 rounded-xl shadow-sm text-center cursor-not-allowed select-none">
                Orders
              </button>
              <button 
                onClick={() => { setMenuOpen(false); navigate('/cart'); }}
                className="w-full text-[#4A1F12] hover:text-[#C96F42] text-sm font-bold py-2.5 border border-[#EED9B7] rounded-xl text-center hover:bg-[#FFF8ED] bg-[#FFF6E5] cursor-pointer"
              >
                Cart
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

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black font-serif-cafe tracking-tight text-[#4A1F12]">
            Past Orders
          </h1>
        </div>

        {error && (
          <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-sm">
            <p className="text-xs font-semibold text-red-808">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-16 text-center text-[#8A6858] shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
            Loading orders list...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-16 text-center shadow-sm">
            <p className="text-sm font-extrabold text-[#4A1F12] font-serif-cafe">No orders placed yet.</p>
            <p className="text-xs text-[#8A6858] mt-1">Order food from the home menu to see order details here.</p>
            <button 
              onClick={handleGoHome}
              className="mt-6 bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold text-xs px-6 py-3 rounded-full cursor-pointer transition shadow-md shadow-amber-900/10"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const orderDate = new Date(order.createdAt);
              const formattedDate = orderDate.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });

              // Status styles mapping
              const isDelivered = order.status === 'Delivered';
              const isRejected = order.status === 'Rejected';
              const isAccepted = order.status === 'Accepted';

              return (
                <div 
                  key={order._id} 
                  className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl shadow-sm overflow-hidden p-6 space-y-4"
                >
                  {/* Top Details Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    {/* Left: Food platter photo + Restaurant Name, Campus, and view details link */}
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                      <div className="h-20 w-20 rounded-xl overflow-hidden border border-[#EED9B7] bg-[#F7E8CC]/55 shrink-0">
                        <img 
                          src={
                            foods.find(f => String(f._id) === String(order.items[0]?.foodItemId))?.image || 
                            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&auto=format&fit=crop&q=80'
                          } 
                          className="h-full w-full object-cover" 
                          alt="Food Item" 
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&auto=format&fit=crop&q=80' }}
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-black text-[#4A1F12] font-serif-cafe leading-snug">
                          FOODIEE Central Kitchen
                        </h2>
                        <p className="text-xs text-[#8A6858] font-bold mt-0.5">
                          Innovate Campus Cafeteria, KARE
                        </p>
                        <p className="text-[10px] text-[#8A6858]/80 mt-1 font-semibold">
                          ORDER #{order._id.substring(order._id.length - 12).toUpperCase()} | {formattedDate}
                        </p>
                        
                        {/* Toggle expanded details action */}
                        <button
                          onClick={() => toggleDetails(order._id)}
                          className="text-[#C96F42] hover:text-[#B85C38] text-xs font-black tracking-wider uppercase inline-block mt-2.5 transition cursor-pointer"
                        >
                          {expandedOrderId === order._id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                        </button>
                      </div>
                    </div>

                    {/* Right: status check list */}
                    <div className="shrink-0 text-right sm:self-start">
                      <div className="flex sm:flex-row-reverse items-center justify-end gap-2 text-xs font-extrabold text-[#3B1D14]">
                        {isDelivered && (
                          <>
                            <DeliveredDoubleTickIcon />
                            <span className="text-[#C96F42]">Delivered on {orderDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </>
                        )}
                        {isRejected && (
                          <>
                            <RejectedCrossIcon />
                            <span className="text-red-650 font-extrabold">Rejected</span>
                          </>
                        )}
                        {isAccepted && (
                          <>
                            <AcceptedSingleTickIcon />
                            <span className="text-emerald-700 font-extrabold">Accepted</span>
                          </>
                        )}
                        {!isDelivered && !isRejected && !isAccepted && (
                          <>
                            <InfoPendingIcon />
                            <span className="text-amber-600">{order.status}</span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Expanded Item details view if toggled */}
                  {expandedOrderId === order._id && (
                    <div className="bg-[#F7E8CC]/50 rounded-2xl p-4 border border-[#EED9B7]/50 text-xs font-semibold text-[#3B1D14] space-y-2 font-sans">
                      <p className="text-[10px] uppercase font-bold text-[#8A6858] tracking-wider mb-2 border-b border-[#EED9B7]/50 pb-1">
                        Placed by: {order.teamName}
                      </p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center my-0.5">
                          <div>
                            <span className="font-bold text-[#8A6858] shrink-0 inline-block w-8">x{item.quantity}</span>
                            <span className="text-[#4A1F12] font-bold">{item.name}</span>
                          </div>
                          <span>{formatMoney(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dotted border separator */}
                  <div className="border-t border-dashed border-[#EED9B7]/60" />

                  {/* Middle Section: Items Summary & Billing Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm font-semibold text-[#3B1D14]">
                    <div className="truncate text-[#3B1D14] font-bold max-w-lg">
                      {order.items.map((it) => `${it.name} x ${it.qty || it.quantity}`).join(', ')}
                    </div>
                    <div className="shrink-0 text-[#8A6858] font-semibold sm:text-right">
                      Total Paid: <span className="font-black text-[#4A1F12] ml-1">{formatMoney(order.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Bottom Interaction Selector Row */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleReorder(order.items)}
                      className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      Reorder
                    </button>
                    <button
                      onClick={() => handleHelp(order._id)}
                      className="border border-[#EED9B7] hover:bg-[#F7E8CC] text-[#8A6858] font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition"
                    >
                      Help
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
};

export default Orders;
