import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrders, fetchFoodItems } from '../api';
import kareLogo from '../assets/CB-KARE.jpeg';
import innovateKareLogo from '../assets/innovate-kare-logo.svg';

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
  <svg className="h-4.5 w-4.5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DeliveredDoubleTickIcon = () => (
  <svg className="h-4.5 w-4.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 13l4 4L14 7" opacity="0.6" />
    <path d="M8 13l4 4L20 7" />
  </svg>
);

const InfoPendingIcon = () => (
  <svg className="h-5 w-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
      setLoading(false);
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
    <div className="min-h-screen bg-[#f1f3f6] text-slate-800 font-sans pb-20">
      
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-205 sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={kareLogo} className="h-full w-full object-cover" alt="KARE Logo" />
            </div>
            <img src={innovateKareLogo} className="h-9 object-contain" alt="Innovate Kare Logo" />
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
            <button 
              onClick={handleGoHome}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
            >
              Home
            </button>
            <button className="bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full cursor-not-allowed shadow-sm select-none">
              Orders
            </button>
            <button 
              onClick={() => navigate('/cart')}
              className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
            >
              Cart
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

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Past Orders
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-sm">
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-slate-100 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76] mx-auto mb-3"></div>
            Loading orders list...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-150 shadow-sm">
            <p className="text-sm font-extrabold text-slate-550">No orders placed yet.</p>
            <p className="text-xs text-slate-400 mt-1">Order food from the home menu to see order details here.</p>
            <button 
              onClick={handleGoHome}
              className="mt-6 bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold text-xs px-6 py-3 rounded-full cursor-pointer transition shadow-md shadow-pink-500/10"
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
                  className="bg-white border border-slate-205 rounded-xl shadow-xs overflow-hidden p-6 space-y-4"
                >
                  {/* Top Swiggy-like Details Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    {/* Left: Food platter photo + Restaurant Name, Campus, and view details link */}
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                      <div className="h-20 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
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
                        <h2 className="text-base font-black text-slate-900 leading-snug">
                          FOODIEE Central Kitchen
                        </h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Innovate Campus Cafeteria, KARE
                        </p>
                        <p className="text-[10px] text-slate-450 mt-1 font-semibold">
                          ORDER #{order._id.substring(order._id.length - 12).toUpperCase()} | {formattedDate}
                        </p>
                        
                        {/* Toggle expanded details action */}
                        <button
                          onClick={() => toggleDetails(order._id)}
                          className="text-[#ff1b76] hover:text-[#e21163] text-xs font-black tracking-wider uppercase inline-block mt-2.5 transition cursor-pointer"
                        >
                          {expandedOrderId === order._id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                        </button>
                      </div>
                    </div>

                    {/* Right: Swiggy-style status check list */}
                    <div className="shrink-0 text-right sm:self-start">
                      <div className="flex sm:flex-row-reverse items-center justify-end gap-2 text-xs font-extrabold text-slate-700">
                        {isDelivered && (
                          <>
                            <DeliveredDoubleTickIcon />
                            <span className="text-blue-600">Delivered on {orderDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </>
                        )}
                        {isRejected && (
                          <>
                            <RejectedCrossIcon />
                            <span className="text-red-500 font-extrabold">Rejected</span>
                          </>
                        )}
                        {isAccepted && (
                          <>
                            <AcceptedSingleTickIcon />
                            <span className="text-emerald-600 font-extrabold">Accepted</span>
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
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 animate-fade-in text-xs font-semibold text-slate-700 space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 border-b border-slate-200 pb-1">
                        Placed by: {order.teamName}
                      </p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center my-0.5">
                          <div>
                            <span className="font-bold text-slate-550 shrink-0 inline-block w-8">x{item.quantity}</span>
                            <span className="text-slate-805 font-bold">{item.name}</span>
                          </div>
                          <span>{formatMoney(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dotted border separator */}
                  <div className="border-t border-dashed border-slate-200" />

                  {/* Middle Section: Items Summary & Billing Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm font-semibold text-slate-850">
                    <div className="truncate text-slate-800 font-bold max-w-lg">
                      {order.items.map((it) => `${it.name} x ${it.qty || it.quantity}`).join(', ')}
                    </div>
                    <div className="shrink-0 text-slate-600 font-semibold sm:text-right">
                      Total Paid: <span className="font-black text-slate-900 ml-1">{formatMoney(order.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Bottom Swiggy Interaction Selector Row */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleReorder(order.items)}
                      className="bg-[#ff1b76] hover:bg-[#e21163] text-white font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      Reorder
                    </button>
                    <button
                      onClick={() => handleHelp(order._id)}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition"
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
