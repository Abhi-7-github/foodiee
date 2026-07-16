import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  loginAdmin, 
  verifyAdmin,
  fetchFoodItems,
  uploadFoodItem,
  deleteFoodItem,
  adminFetchOrders,
  adminUpdateOrderStatus,
  fetchPaymentConfig,
  updatePaymentConfig
} from '../api';
import innovateKareLogo from '../assets/Logo.png';



const AdminPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Admin secret token
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);

  // Selected sub-tab in workspace: 'menu' | 'orders' | 'payments'
  const [activeTab, setActiveTab] = useState('menu');
  const [menuOpen, setMenuOpen] = useState(false);

  // Food Items catalog state
  const [foodItems, setFoodItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New Food Item form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Veg');
  const [isVeg, setIsVeg] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submittingFood, setSubmittingFood] = useState(false);
  const [formError, setFormError] = useState('');

  // Received Orders state
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  // Food counts filter states
  const [countsSearch, setCountsSearch] = useState('');
  const [countsCategory, setCountsCategory] = useState('All');

  // Payment configuration state
  const [paymentConfig, setPaymentConfig] = useState({ isActive: false, qrCodeUrl: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentQrFile, setPaymentQrFile] = useState(null);
  const [paymentQrPreview, setPaymentQrPreview] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Global operation feedback
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // Fetch food items list
  const loadFoodItems = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError('');
      const data = await fetchFoodItems();
      setFoodItems(data.foodItems || []);
    } catch (err) {
      console.error(err);
      setListError('Failed to load active food items.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadPaymentConfig = useCallback(async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      const data = await fetchPaymentConfig();
      if (data.config) {
        setPaymentConfig({
          isActive: data.config.isActive || false,
          qrCodeUrl: data.config.qrCodeUrl || '',
        });
      }
    } catch (err) {
      console.error(err);
      setPaymentError('Failed to fetch payment config properties.');
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  const loadAdminOrders = useCallback(async () => {
    try {
      setAdminOrdersLoading(true);
      setOrdersError('');
      const data = await adminFetchOrders(adminToken);
      setAdminOrders(data.orders || []);
    } catch (err) {
      console.error(err);
      setOrdersError('Failed to load backend orders list.');
    } finally {
      setAdminOrdersLoading(false);
    }
  }, [adminToken]);

  const verifyToken = useCallback(async () => {
    const localToken = localStorage.getItem('adminToken');
    if (!localToken) {
      setIsAdmin(false);
      setCheckingAuth(false);
      return;
    }
    try {
      await verifyAdmin(localToken);
      setIsAdmin(true);
      setAdminToken(localToken);
      loadFoodItems();
    } catch (err) {
      console.error(err);
      localStorage.removeItem('adminToken');
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  }, [loadFoodItems]);

  const handleSavePaymentConfig = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setSuccessMsg('');
    setUpdatingPayment(true);

    try {
      const formData = new FormData();
      formData.append('isActive', paymentConfig.isActive);
      if (paymentQrFile) {
        formData.append('qrCode', paymentQrFile);
      } else {
        formData.append('qrCodeUrl', paymentConfig.qrCodeUrl);
      }

      const res = await updatePaymentConfig(formData, adminToken);

      if (res.config) {
        setPaymentConfig({
          isActive: res.config.isActive || false,
          qrCodeUrl: res.config.qrCodeUrl || '',
        });
        setPaymentQrFile(null);
        setPaymentQrPreview('');
        setSuccessMsg('Payment Configuration settings saved successfully!');
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to update payment configuration.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Handle Admin Login Click
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const trimmed = adminKeyInput.trim();
    if (!trimmed) {
      setLoginError('Please enter your Secret Key.');
      return;
    }

    setSubmittingLogin(true);
    try {
      const data = await loginAdmin(trimmed);
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
        setIsAdmin(true);
        setAdminKeyInput('');
        loadFoodItems();
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Invalid Admin key.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await adminUpdateOrderStatus(orderId, newStatus, adminToken);
      setAdminOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
      setSuccessMsg(`Status of Order #${orderId.substring(orderId.length - 6).toUpperCase()} updated to ${newStatus}`);
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // File input select handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  // Submit new food item
  const handleAddFoodItem = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setFormError('Item Name is required.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setFormError('Please enter a valid numeric Price.');
      return;
    }
    if (!selectedFile) {
      setFormError('Please upload an item presentation image.');
      return;
    }

    setSubmittingFood(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', Number(price));
      formData.append('category', category);
      formData.append('isVeg', isVeg);
      formData.append('isBestseller', isBestseller);
      formData.append('image', selectedFile);

      const data = await uploadFoodItem(formData, adminToken);
      if (data.foodItem) {
        setFoodItems((prev) => [data.foodItem, ...prev]);
        setSuccessMsg(`Successfully published detail card for ${data.foodItem.name}!`);
        
        // Reset state
        setName('');
        setDescription('');
        setPrice('');
        setCategory('Veg');
        setIsVeg(true);
        setIsBestseller(false);
        setSelectedFile(null);
        setImagePreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to upload new food item metadata.');
    } finally {
      setSubmittingFood(false);
    }
  };

  // Delete food item callback
  const handleDeleteFood = async (id, foodName) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${foodName}"?`)) {
      return;
    }

    try {
      setActionLoadingId(id);
      await deleteFoodItem(id, adminToken);
      setFoodItems((prev) => prev.filter((item) => item._id !== id));
      setSuccessMsg(`"${foodName}" was deleted from active buffet options.`);
    } catch (err) {
      setListError(`Failed to delete item: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Exit Administrative mode
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdmin(false);
    setFoodItems([]);
    setSuccessMsg('');
  };

  // Sync Payment Configurations on Tab Enter
  useEffect(() => {
    if (isAdmin && activeTab === 'payments') {
      Promise.resolve().then(() => {
        loadPaymentConfig();
      });
    }
  }, [isAdmin, activeTab, loadPaymentConfig]);

  // Verify Admin authentication on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      verifyToken();
    });
  }, [verifyToken]);

  // Manage Orders / Counts Tab view sync
  useEffect(() => {
    if (isAdmin && (activeTab === 'orders' || activeTab === 'counts')) {
      Promise.resolve().then(() => {
        loadAdminOrders();
      });
    }
  }, [isAdmin, activeTab, loadAdminOrders]);

  // Compute counts
  const prepCounts = useMemo(() => {
    const counts = {};
    
    // Initialize mapping
    foodItems.forEach(item => {
      counts[item._id] = {
        _id: item._id,
        name: item.name,
        image: item.image,
        category: item.category || 'General',
        isVeg: item.isVeg !== false,
        Pending: 0,
        Accepted: 0,
        Delivered: 0,
        Rejected: 0,
        total: 0
      };
    });

    // Accumulate quantities from orders
    adminOrders.forEach(order => {
      if (order.status !== 'Accepted') return;
      const status = 'Accepted';

      order.items.forEach(it => {
        const foodId = it.foodItemId;
        const qty = Number(it.quantity || it.qty || 0);

        if (foodId) {
          if (!counts[foodId]) {
            const catalogItem = foodItems.find(f => String(f._id) === String(foodId));
            counts[foodId] = {
              _id: foodId,
              name: catalogItem ? catalogItem.name : it.name,
              image: catalogItem ? catalogItem.image : '',
              category: catalogItem ? (catalogItem.category || 'General') : 'General',
              isVeg: catalogItem ? (catalogItem.isVeg !== false) : (it.isVeg !== false),
              Pending: 0,
              Accepted: 0,
              Delivered: 0,
              Rejected: 0,
              total: 0
            };
          }
          counts[foodId][status] += qty;
          counts[foodId].total += qty;
        } else {
          // fallback search by name
          const catalogItem = foodItems.find(f => f.name && f.name.toLowerCase().trim() === String(it.name || '').toLowerCase().trim());
          if (catalogItem) {
            const key = catalogItem._id;
            counts[key][status] += qty;
            counts[key].total += qty;
          } else {
            const key = it.name || 'Unknown';
            if (!counts[key]) {
              counts[key] = {
                _id: key,
                name: key,
                image: '',
                category: 'General',
                isVeg: it.isVeg !== false,
                Pending: 0,
                Accepted: 0,
                Delivered: 0,
                Rejected: 0,
                total: 0
              };
            }
            counts[key][status] += qty;
            counts[key].total += qty;
          }
        }
      });
    });

    return Object.values(counts);
  }, [foodItems, adminOrders]);

  const filteredCounts = useMemo(() => {
    return prepCounts.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(countsSearch.toLowerCase());
      const matchesCategory = countsCategory === 'All' || 
        (countsCategory === 'Veg' && item.isVeg) || 
        (countsCategory === 'Non-Veg' && !item.isVeg);
      return matchesSearch && matchesCategory;
    });
  }, [prepCounts, countsSearch, countsCategory]);

  // Render verifying spinner
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7E8CC] text-[#3B1D14] transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96F42]"></div>
        <p className="mt-4 text-sm font-semibold animate-pulse text-[#C96F42]">Verifying Admin Shield...</p>
      </div>
    );
  }

  // Admin Login Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7E8CC] px-4 py-12 transition-colors duration-300">
        <div className="w-full max-w-md bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl shadow-xl p-8 space-y-6 relative overflow-hidden">
          {/* Decorative blur background */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#EED9B7] opacity-25 blur-xl"></div>
          
          <div className="text-center relative z-10">
            <h1 className="text-2xl font-black font-serif-cafe tracking-tight text-[#4A1F12]">Admin Console</h1>
            <p className="text-xs text-[#8A6858] font-semibold mt-1">Verify credentials to manage the active food menu</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label htmlFor="adminKey" className="block text-sm font-semibold text-[#8A6858]">
                Enter Admin Secret Key
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Enter system admin key"
                className="w-full px-4 py-3 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C96F42] focus:border-[#C96F42] transition duration-200 text-[#3B1D14] text-base"
                disabled={submittingLogin}
              />
            </div>

            {loginError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2 shadow-sm">
                <p className="text-xs font-semibold text-red-808 leading-normal">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingLogin}
              className="w-full bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-900/10 active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-75 text-base cursor-pointer"
            >
              {submittingLogin ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Access Menu Management</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Panel
  return (
    <div className="min-h-screen bg-[#F7E8CC] text-[#3B1D14] flex flex-col font-sans transition-colors duration-300">
      
      {/* Navbar */}
      <header className="bg-[#FFF6E5] border-b border-[#EED9B7] sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={innovateKareLogo} className="h-14 w-auto object-contain" alt="Logo" />
            </div>

            {/* Desktop Menu Navbar (Tablet/Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className={`${
                  activeTab === 'menu'
                    ? 'bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer'
                }`}
                disabled={activeTab === 'menu'}
              >
                Manage Menu
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`${
                  activeTab === 'orders'
                    ? 'bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer'
                }`}
                disabled={activeTab === 'orders'}
              >
                Manage Orders
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`${
                  activeTab === 'payments'
                    ? 'bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer'
                }`}
                disabled={activeTab === 'payments'}
              >
                Payment Setup
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('counts')}
                className={`${
                  activeTab === 'counts'
                    ? 'bg-[#C96F42] text-[#FFF8ED] font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] hover:text-[#C96F42] text-sm font-semibold transition duration-150 cursor-pointer'
                }`}
                disabled={activeTab === 'counts'}
              >
                Food Counts
              </button>
              
              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-6 py-2.5 border border-[#EED9B7] hover:bg-[#EED9B7]/50 rounded-full text-sm font-semibold text-[#3B1D14] transition duration-150 cursor-pointer"
              >
                Logout
              </button>
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
                type="button"
                onClick={() => { setMenuOpen(false); setActiveTab('menu'); }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition cursor-pointer ${
                  activeTab === 'menu'
                    ? 'bg-[#C96F42] text-[#FFF8ED] shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] border border-[#EED9B7] bg-[#FFF6E5] hover:bg-[#FFF8ED]'
                }`}
                disabled={activeTab === 'menu'}
              >
                Manage Menu
              </button>
              
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setActiveTab('orders'); }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#C96F42] text-[#FFF8ED] shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] border border-[#EED9B7] bg-[#FFF6E5] hover:bg-[#FFF8ED]'
                }`}
                disabled={activeTab === 'orders'}
              >
                Manage Orders
              </button>

              <button
                type="button"
                onClick={() => { setMenuOpen(false); setActiveTab('payments'); }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-[#C96F42] text-[#FFF8ED] shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] border border-[#EED9B7] bg-[#FFF6E5] hover:bg-[#FFF8ED]'
                }`}
                disabled={activeTab === 'payments'}
              >
                Payment Setup
              </button>

              <button
                type="button"
                onClick={() => { setMenuOpen(false); setActiveTab('counts'); }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition cursor-pointer ${
                  activeTab === 'counts'
                    ? 'bg-[#C96F42] text-[#FFF8ED] shadow-sm select-none cursor-not-allowed'
                    : 'text-[#4A1F12] border border-[#EED9B7] bg-[#FFF6E5] hover:bg-[#FFF8ED]'
                }`}
                disabled={activeTab === 'counts'}
              >
                Food Counts
              </button>
              
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleAdminLogout(); }}
                className="w-full py-2.5 border border-[#EED9B7] hover:bg-[#F7E8CC] rounded-xl text-sm font-bold text-[#3B1D14] text-center transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Workspace Dashboard */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Status Messages */}
        {successMsg && (
          <div className="bg-[#FFF6E5] border border-[#EED9B7] text-[#C96F42] px-5 py-4 rounded-xl flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-xs hover:underline text-[#C96F42] font-bold">Dismiss</button>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create Food Form */}
          <section className="lg:col-span-5 bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold font-serif-cafe text-[#4A1F12] flex items-center gap-2">
                Add New Food Item
              </h2>
              <p className="text-xs text-[#8A6858] mt-1">Upload the picture to Cloudinary and define item values</p>
            </div>

            <form onSubmit={handleAddFoodItem} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label htmlFor="foodName" className="block text-xs font-bold uppercase text-[#8A6858]">
                  Item Name
                </label>
                <input
                  id="foodName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Garlic Butter Naan"
                  className="w-full px-4 py-2.5 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C96F42] focus:border-[#C96F42] text-sm text-[#3B1D14]"
                  disabled={submittingFood}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="foodDesc" className="block text-xs font-bold uppercase text-[#8A6858]">
                  Description
                </label>
                <textarea
                  id="foodDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe ingredients, portion, spices..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C96F42] focus:border-[#C96F42] text-sm text-[#3B1D14] resize-none"
                  disabled={submittingFood}
                />
              </div>

              {/* Row Grid: Price & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="foodPrice" className="block text-xs font-bold uppercase text-[#8A6858]">
                    Price (INR)
                  </label>
                  <input
                    id="foodPrice"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 150"
                    min="1"
                    className="w-full px-4 py-2.5 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C96F42] focus:border-[#C96F42] text-sm text-[#3B1D14]"
                    disabled={submittingFood}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="foodCat" className="block text-xs font-bold uppercase text-[#8A6858]">
                    Category
                  </label>
                  <select
                    id="foodCat"
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setIsVeg(newCat === 'Veg');
                    }}
                    className="w-full px-4 py-2.5 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C96F42] focus:border-[#C96F42] text-sm text-[#3B1D14]"
                    disabled={submittingFood}
                  >
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 text-xs font-bold uppercase text-[#8A6858] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isVeg}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsVeg(checked);
                      setCategory(checked ? 'Veg' : 'Non-Veg');
                    }}
                    className="w-4.5 h-4.5 text-[#C96F42] border-[#D9B58C] rounded focus:ring-[#C96F42] cursor-pointer"
                    disabled={submittingFood}
                  />
                  Is Veg Item
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold uppercase text-[#8A6858] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#C96F42] border-[#D9B58C] rounded focus:ring-[#C96F42] cursor-pointer"
                    disabled={submittingFood}
                  />
                  Is Bestseller
                </label>
              </div>

              {/* Image Uploader */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-[#8A6858]">
                  Item Image (Cloudinary Upload)
                </label>
                <div className="flex flex-col items-center justify-center border border-dashed border-[#D9B58C] hover:border-[#C96F42] rounded-2xl py-6 px-4 bg-[#F7E8CC]/30 text-center transition cursor-pointer relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={submittingFood}
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#D9B58C] z-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-205">
                        <span className="text-white text-xs font-bold">Replace File</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-[#8A6858] z-0">
                      <p className="text-xs font-bold text-[#8A6858]">Click or Drag Image Here</p>
                      <p className="text-[10px] text-[#8A6858]/80">JPG, PNG or WEBP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2 shadow-sm">
                  <p className="text-xs font-semibold text-red-808">{formError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingFood}
                className="w-full bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-900/10 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 text-sm cursor-pointer"
              >
                {submittingFood ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"></div>
                    <span>Uploading image & saving fields...</span>
                  </>
                ) : (
                  <span>Publish Item to Menu</span>
                )}
              </button>
            </form>
          </section>

          {/* Active Food List Grid (Beige container) */}
          <section className="lg:col-span-7 bg-[#EED9B7] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#D9B58C] pb-4 sticky top-0 z-10 bg-[#EED9B7]">
              <div>
                <h2 className="text-lg font-bold font-serif-cafe text-[#4A1F12] flex items-center gap-2">
                  Active Menu Panel
                </h2>
                <p className="text-xs text-[#3B1D14] mt-1 font-medium">Review, filter, or remove published items from database</p>
              </div>
              <span className="text-xs font-bold bg-[#FFF6E5] text-[#C96F42] px-3.5 py-1.5 rounded-full border border-[#EED9B7] shadow-sm">
                {foodItems.length} items
              </span>
            </div>

            {listError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg text-xs font-semibold text-red-805 shadow-sm">
                {listError}
              </div>
            )}

            {loadingList ? (
              <div className="py-24 flex flex-col items-center justify-center bg-[#FFF6E5] rounded-3xl border border-[#EED9B7] shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42]"></div>
                <span className="text-xs text-[#8A6858] mt-3 animate-pulse">Refreshing item indexes...</span>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="border border-dashed border-[#D9B58C] bg-[#FFF6E5] rounded-3xl py-20 text-center shadow-sm">
                <p className="text-sm text-[#8A6858] font-semibold">The food menu is currently empty.</p>
                <p className="text-xs text-[#8A6858]/80 mt-1">Use the entry form to upload the first item.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {foodItems.map((item) => (
                  <div 
                    key={item._id} 
                    className="bg-[#FFF6E5] rounded-3xl border border-[#EED9B7]/50 p-3 flex flex-col justify-between hover:border-[#D9B58C] hover:shadow-md transition duration-200"
                  >
                    <div className="space-y-3">
                      <div className="relative h-32 rounded-xl overflow-hidden bg-[#F7E8CC]/55 border border-[#EED9B7] flex items-center justify-center">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.src = 'https://placehold.co/300x200?text=Food+Image' }} 
                        />
                        {/* Upper right badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${item.isVeg !== false ? 'bg-emerald-600' : 'bg-red-500'}`}>
                            {item.isVeg !== false ? 'Veg' : 'Non-Veg'}
                          </span>
                          {item.isBestseller && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#FFF6E5] text-[#C96F42] px-2 py-0.5 rounded-full border border-[#EED9B7]">
                              Bestseller
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-[#8A6858] tracking-wider">
                            {item.category || 'General'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold font-serif-cafe text-[#3B1D14] truncate">{item.name}</h3>
                        <p className="text-[11px] text-[#8A6858] leading-normal line-clamp-2 min-h-[32px]">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#EED9B7]/40 pt-3 mt-3">
                      <span className="text-sm font-extrabold text-[#C96F42]">₹{item.price}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFood(item._id, item.name)}
                        disabled={actionLoadingId === item._id}
                        className="bg-red-50 border border-red-200 text-red-650 hover:bg-red-600 hover:text-white hover:border-red-600 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                        title="Delete Item"
                      >
                        {actionLoadingId === item._id ? 'Removing...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          </div>
        )}

        {/* Manage Orders View */}
        {activeTab === 'orders' && (
          <section className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-black font-serif-cafe text-[#4A1F12]">
                Received Client Orders
              </h2>
              <p className="text-xs text-[#8A6858] mt-1">
                Monitor live order streams, review purchased quantities, and advance statuses
              </p>
            </div>

            {ordersError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2 shadow-sm">
                <p className="text-xs font-semibold text-red-808">{ordersError}</p>
              </div>
            )}

            {adminOrdersLoading ? (
              <div className="py-20 text-center text-[#8A6858] font-medium">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
                Loading orders database...
              </div>
            ) : adminOrders.length === 0 ? (
              <div className="border border-dashed border-[#D9B58C] rounded-3xl py-20 text-center bg-[#F7E8CC]/10">
                <p className="text-sm text-[#8A6858] font-bold">No orders received yet.</p>
                <p className="text-xs text-[#8A6858]/80 mt-1">Live requests from active teams will populate here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-[#EED9B7] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#EED9B7]/40 text-[#4A1F12] text-xs font-black uppercase tracking-wider border-b border-[#EED9B7]">
                      <th className="px-6 py-4">Placement Date</th>
                      <th className="px-6 py-4">Active Team</th>
                      <th className="px-6 py-4">Delicacies List</th>
                      <th className="px-6 py-4">Total Price</th>
                      <th className="px-6 py-4 text-center">Payment Proof</th>
                      <th className="px-6 py-4">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EED9B7]/50 text-sm font-semibold text-[#3B1D14]">
                    {adminOrders.map((order) => {
                      const formattedDate = new Date(order.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={order._id} className="hover:bg-[#F7E8CC]/30 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="block text-[#3B1D14] font-extrabold">{formattedDate}</span>
                            <span className="text-[10px] text-[#8A6858] font-bold block mt-0.5">ID: {order._id}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3.5 py-1.5 bg-[#EED9B7] text-[#3B1D14] rounded-full text-xs font-black border border-[#D9B58C]">
                              {order.teamName}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-sm">
                            <ul className="space-y-1 text-xs">
                              {order.items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-[#8A6858] font-black">x{it.quantity}</span>
                                  <span className="text-[#3B1D14] font-bold">{it.name}</span>
                                  <span className="text-[#8A6858]/80 font-bold">(₹{it.price})</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#C96F42] font-black text-sm">
                            INR {order.totalAmount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-[#8A6858] text-center">
                            {order.transactionId ? (
                              <div className="space-y-1 text-center">
                                <span className="block font-black text-[#3B1D14] tracking-tight">TXN: {order.transactionId}</span>
                                {order.paymentScreenshot && (
                                  <a 
                                    href={order.paymentScreenshot} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-block text-[#C96F42] hover:underline text-[10px] uppercase font-black tracking-wider"
                                  >
                                    View Screenshot ↗
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#8A6858] italic text-[11px]">Terminal Cash/Pay</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                              className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-all ${
                                order.status === 'Accepted'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-205'
                                  : order.status === 'Delivered'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : order.status === 'Rejected'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-205'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Payments configuration Setup */}
        {activeTab === 'payments' && (
          <section className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto">
            <div>
              <h2 className="text-xl font-black font-serif-cafe text-[#4A1F12]">
                Payment Settings & Setup
              </h2>
              <p className="text-xs text-[#8A6858] mt-1">
                Configure scan-to-pay QR codes and enable/disable the manual upload payment checks
              </p>
            </div>

            {paymentError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-red-850">{paymentError}</p>
              </div>
            )}

            {paymentLoading ? (
              <div className="py-16 text-center text-[#8A6858] font-medium">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
                Syncing settings...
              </div>
            ) : (
              <form onSubmit={handleSavePaymentConfig} className="space-y-6">
                
                {/* 1. Toggle Status */}
                <div className="flex items-center justify-between p-4 bg-[#F7E8CC]/35 border border-[#EED9B7] rounded-2xl">
                  <div>
                    <h3 className="text-sm font-black text-[#3B1D14]">QR Code Payment Flow</h3>
                    <p className="text-[11px] text-[#8A6858] mt-0.5">
                      Force user checkout through qr scan, screenshot uploads, and unique transaction check
                    </p>
                  </div>
                  
                  {/* On/Off Switch Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
                      paymentConfig.isActive ? 'bg-[#C96F42]' : 'bg-[#D9B58C]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-205 ease-in-out ${
                        paymentConfig.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. QR Code Picture Preview & Edit */}
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase text-[#8A6858] tracking-wider">
                    Current QR Code Image
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* View QR Code */}
                    <div className="w-40 h-40 border border-[#D9B58C] rounded-2xl flex items-center justify-center p-2 bg-[#F7E8CC]/45 overflow-hidden relative shrink-0">
                      {paymentQrPreview ? (
                        <img src={paymentQrPreview} className="w-full h-full object-contain rounded-xl" alt="Preview QR" />
                      ) : paymentConfig.qrCodeUrl ? (
                        <img src={paymentConfig.qrCodeUrl} className="w-full h-full object-contain rounded-xl" alt="Active QR" />
                      ) : (
                        <div className="text-center p-3 text-[10px] text-[#8A6858] font-bold">
                          No QR Code uploaded
                        </div>
                      )}
                    </div>

                    {/* Edit QR Code file button */}
                    <div className="space-y-2 flex-grow text-center sm:text-left">
                      <p className="text-xs text-[#3B1D14] font-bold">Upload New QR Code Image</p>
                      <p className="text-[10px] text-[#8A6858] leading-relaxed">
                        Replace current barcode image with a new UPI scanner. JPEGs/PNGs up to 5MB supported.
                      </p>
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setPaymentQrFile(file);
                            setPaymentQrPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                        id="newQrUploadInput"
                        disabled={updatingPayment}
                      />
                      
                      <button
                        type="button"
                        onClick={() => document.getElementById('newQrUploadInput').click()}
                        disabled={updatingPayment}
                        className="px-4 py-2 border border-[#EED9B7] hover:bg-[#F7E8CC]/40 text-[#4A1F12] rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Choose QR Code
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Action Place Submit */}
                <div className="pt-4 border-t border-[#EED9B7]/50 flex items-center justify-end gap-3">
                  {paymentQrPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentQrFile(null);
                        setPaymentQrPreview('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-[#8A6858] hover:text-[#3B1D14] transition cursor-pointer"
                      disabled={updatingPayment}
                    >
                      Clear Changes
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    disabled={updatingPayment}
                    className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md shadow-amber-900/10 cursor-pointer disabled:opacity-50"
                  >
                    {updatingPayment ? 'Saving settings...' : 'Save Settings'}
                  </button>
                </div>

              </form>
            )}
          </section>
        )}

        {/* Counts tab view */}
        {activeTab === 'counts' && (
          <section className="bg-[#FFF6E5] border border-[#EED9B7] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black font-serif-cafe text-[#4A1F12]">
                  Food Item Preparation Summary
                </h2>
                <p className="text-xs text-[#8A6858] mt-1">
                  Presents total ordered quantities and active prep counts separately for each food item.
                </p>
              </div>

              {/* Reload Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await Promise.all([loadFoodItems(), loadAdminOrders()]);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition cursor-pointer self-start sm:self-auto"
              >
                Reload Data
              </button>
            </div>

            {/* Filter controls row */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              {/* Search input */}
              <div className="flex items-center rounded-xl border border-[#D9B58C] bg-[#FFF6E5] px-3 py-2 w-full max-w-sm">
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={countsSearch}
                  onChange={(e) => setCountsSearch(e.target.value)}
                  className="bg-transparent text-sm text-[#3B1D14] placeholder-[#8A6858]/60 font-semibold focus:outline-none w-full"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2">
                {['All', 'Veg', 'Non-Veg'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCountsCategory(cat)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      countsCategory === cat
                        ? 'bg-[#C96F42] text-[#FFF8ED] shadow-sm'
                        : 'border border-[#EED9B7] bg-[#FFF6E5] text-[#8A6858] hover:bg-[#F7E8CC]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {ordersError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-red-750">{ordersError}</p>
              </div>
            )}

            {adminOrdersLoading ? (
              <div className="py-20 text-center text-[#8A6858] font-medium">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C96F42] mx-auto mb-3"></div>
                Calculating totals...
              </div>
            ) : filteredCounts.length === 0 ? (
              <div className="border border-dashed border-[#D9B58C] rounded-3xl py-20 text-center bg-[#F7E8CC]/10">
                <p className="text-sm text-[#8A6858] font-bold">No matching food items found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-[#EED9B7] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#EED9B7]/40 text-[#4A1F12] text-xs font-black uppercase tracking-wider border-b border-[#EED9B7]">
                      <th className="px-6 py-4">Food Item</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center bg-[#EED9B7]/20 font-black">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EED9B7]/50 text-sm font-semibold text-[#3B1D14]">
                    {filteredCounts.map((item) => (
                      <tr key={item._id} className="hover:bg-[#F7E8CC]/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#EED9B7] bg-[#F7E8CC]/55 shrink-0">
                                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg border border-dashed border-[#D9B58C] flex items-center justify-center text-xs text-[#8A6858] font-black shrink-0">
                                Food
                              </div>
                            )}
                            <span className="font-extrabold text-[#3B1D14]">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                            item.isVeg
                              ? 'bg-emerald-50 text-emerald-700 border-[#A7F3D0]'
                              : 'bg-red-50 text-red-650 border-[#FCA5A5]'
                          }`}>
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap font-black font-mono text-[#4A1F12] bg-[#EED9B7]/10 text-base">
                          {item.total > 0 ? item.total : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
