import React, { useState, useEffect, useRef } from 'react';
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
import kareLogo from '../assets/CB-KARE.jpeg';
import innovateKareLogo from '../assets/innovate-kare-logo.svg';

const AdminPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'));
  const [adminKeyInput, setAdminKeyInput] = useState('');
  
  // Food items data
  const [foodItems, setFoodItems] = useState([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Veg');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  
  // Status states
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [submittingFood, setSubmittingFood] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  const [loginError, setLoginError] = useState('');
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'orders', or 'payments'
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  // Payment configuration states
  const [paymentConfig, setPaymentConfig] = useState({ isActive: false, qrCodeUrl: '' });
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentQrFile, setPaymentQrFile] = useState(null);
  const [paymentQrPreview, setPaymentQrPreview] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const loadPaymentConfig = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      const data = await fetchPaymentConfig();
      if (data.config) {
        setPaymentConfig(data.config);
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to fetch payment config settings.');
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPaymentConfig();
    }
  }, [activeTab]);

  const handleSavePaymentConfig = async (e) => {
    e.preventDefault();
    setUpdatingPayment(true);
    setPaymentError('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('isActive', paymentConfig.isActive);
    if (paymentQrFile) {
      formData.append('qrCode', paymentQrFile);
    }

    try {
      const data = await updatePaymentConfig(formData, adminToken);
      setPaymentConfig(data.config);
      setPaymentQrFile(null);
      setPaymentQrPreview('');
      setSuccessMsg('Payment configuration saved successfully!');
    } catch (err) {
      setPaymentError(err.message || 'Failed to update payment configuration.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const fileInputRef = useRef(null);

  // 1. Verify token status on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!adminToken) {
        setCheckingAuth(false);
        return;
      }
      try {
        await verifyAdmin(adminToken);
        setIsAdmin(true);
        loadFoodItems();
      } catch (err) {
        console.error("Admin validation failed:", err.message);
        localStorage.removeItem('adminToken');
        setAdminToken(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    verifyToken();
  }, [adminToken]);

  // 2. Fetch food items list
  const loadFoodItems = async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await fetchFoodItems();
      setFoodItems(data.foodItems || []);
    } catch (err) {
      setListError(err.message || 'Failed to sync food items list.');
    } finally {
      setLoadingList(false);
    }
  };

  // 3. Handle Admin Login Click
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const trimmed = adminKeyInput.trim();
    if (!trimmed) {
      setLoginError('Please enter the Admin Key.');
      return;
    }

    setSubmittingLogin(true);
    try {
      const data = await loginAdmin(trimmed);
      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      setIsAdmin(true);
      setAdminKeyInput('');
      // Load foods list with new token
      setLoadingList(true);
      const foodData = await fetchFoodItems();
      setFoodItems(foodData.foodItems || []);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Invalid Admin Key.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const loadAdminOrders = async () => {
    try {
      setAdminOrdersLoading(true);
      setOrdersError('');
      const data = await adminFetchOrders(adminToken);
      setAdminOrders(data.orders || []);
    } catch (err) {
      setOrdersError(err.message || 'Failed to fetch admin orders.');
    } finally {
      setAdminOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' && adminToken) {
      loadAdminOrders();
    }
  }, [activeTab, adminToken]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setSuccessMsg('');
      const data = await adminUpdateOrderStatus(orderId, newStatus, adminToken);
      setSuccessMsg(data.message || `Order status updated to ${newStatus}`);
      setAdminOrders((prevOrders) =>
        prevOrders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  // 4. File input select handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  // 5. Submit new food item
  const handleAddFoodItem = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!name.trim()) return setFormError('Food name is required.');
    if (!description.trim()) return setFormError('Description is required.');
    if (!price || Number(price) <= 0) return setFormError('Please enter a valid price greater than 0.');
    if (!imageFile) return setFormError('Please upload an image for the food item.');

    setSubmittingFood(true);
    
    // Construct FormData for multipart transfer
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('price', price);
    formData.append('category', category);
    formData.append('image', imageFile);
    formData.append('isVeg', isVeg);
    formData.append('isBestseller', isBestseller);

    try {
      const result = await uploadFoodItem(formData, adminToken);
      setSuccessMsg(`Food item "${result.foodItem.name}" was successfully uploaded and added.`);
      
      // Reset Form fields
      setName('');
      setDescription('');
      setPrice('');
      setCategory('Veg');
      setImageFile(null);
      setImagePreview('');
      setIsVeg(true);
      setIsBestseller(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Reload list
      loadFoodItems();
    } catch (err) {
      setFormError(err.message || 'Failed to upload food item. Check Cloudinary settings.');
    } finally {
      setSubmittingFood(false);
    }
  };

  // 6. Delete food item callback
  const handleDeleteFood = async (id, foodName) => {
    if (!window.confirm(`Are you sure you want to delete "${foodName}"?`)) {
      return;
    }
    setActionLoadingId(id);
    setSuccessMsg('');
    try {
      await deleteFoodItem(id, adminToken);
      setSuccessMsg(`Food item "${foodName}" deleted successfully.`);
      setFoodItems(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert(`Error deleting food item: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 7. Exit Administrative mode
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdmin(false);
    setFoodItems([]);
    setSuccessMsg('');
  };

  // Render verifying spinner (White/Pink theme)
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfafb] text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff1b76]"></div>
        <p className="mt-4 text-sm font-semibold animate-pulse text-[#ff1b76]">Verifying Admin Shield...</p>
      </div>
    );
  }

  // Admin Login Screen (White/Pink theme with golden yellow accents)
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfafb] px-4 py-12">
        <div className="w-full max-w-md bg-white border border-pink-100/50 rounded-3xl shadow-xl p-8 space-y-6 relative overflow-hidden">
          {/* Yellow circle blur background decoration */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#fde68a] opacity-25 blur-xl"></div>
          
          <div className="text-center relative z-10">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Admin Console</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">Verify credentials to manage the active food menu</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label htmlFor="adminKey" className="block text-sm font-semibold text-slate-700">
                Enter Admin Secret Key
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Enter system admin key"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff1b76] focus:border-[#ff1b76] transition duration-200 text-slate-800 text-base"
                disabled={submittingLogin}
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2">
                <p className="text-xs font-semibold text-red-700 leading-normal">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingLogin}
              className="w-full bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-pink-500/20 active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-75 text-base cursor-pointer"
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
    <div className="min-h-screen bg-[#fdfafb] text-slate-800 flex flex-col font-sans transition-colors duration-300">
      
      {/* Navbar */}
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
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`${
                activeTab === 'menu'
                  ? 'bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                  : 'text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer'
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
                  ? 'bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                  : 'text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer'
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
                  ? 'bg-[#ff1b76] text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-sm select-none cursor-not-allowed'
                  : 'text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer'
              }`}
              disabled={activeTab === 'payments'}
            >
              Payment Setup
            </button>
            
            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-6 py-2.5 border border-[#e2e8f0] hover:bg-[#fff0f6] rounded-full text-sm font-semibold text-[#2d3748] transition duration-150 cursor-pointer"
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      {/* Workspace Dashboard */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Status Messages */}
        {successMsg && (
          <div className="bg-[#fff0f6] border border-pink-100 text-[#ff1b76] px-5 py-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-xs hover:underline text-[#ff1b76] font-bold">Dismiss</button>
          </div>
        )}

        {/* Workspace Display Navigation Tabs */}
        <div className="border-b border-pink-100/50 pb-1" />

        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create Food Form: 5 cols */}
          <section className="lg:col-span-5 bg-white border border-[#fff0f6] rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Add New Food Item
              </h2>
              <p className="text-xs text-slate-400 mt-1">Upload the picture to Cloudinary and define item values</p>
            </div>

            <form onSubmit={handleAddFoodItem} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label htmlFor="foodName" className="block text-xs font-bold uppercase text-slate-500">
                  Item Name
                </label>
                <input
                  id="foodName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Garlic Butter Naan"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff1b76] focus:border-[#ff1b76] text-sm text-slate-800"
                  disabled={submittingFood}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="foodDesc" className="block text-xs font-bold uppercase text-slate-500">
                  Description
                </label>
                <textarea
                  id="foodDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe ingredients, portion, spices..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff1b76] focus:border-[#ff1b76] text-sm text-slate-800 resize-none"
                  disabled={submittingFood}
                />
              </div>

              {/* Row Grid: Price & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="foodPrice" className="block text-xs font-bold uppercase text-slate-500">
                    Price (INR)
                  </label>
                  <input
                    id="foodPrice"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 150"
                    min="1"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff1b76] focus:border-[#ff1b76] text-sm text-slate-800"
                    disabled={submittingFood}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="foodCat" className="block text-xs font-bold uppercase text-slate-500">
                    Category
                  </label>
                  <select
                    id="foodCat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff1b76] focus:border-[#ff1b76] text-sm text-slate-800"
                    disabled={submittingFood}
                  >
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes: Veg / Non-Veg & Bestseller config */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 text-xs font-bold uppercase text-slate-550 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isVeg}
                    onChange={(e) => setIsVeg(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#ff1b76] border-gray-300 rounded focus:ring-[#ff1b76] cursor-pointer"
                    disabled={submittingFood}
                  />
                  Is Veg Item
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold uppercase text-slate-550 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="w-4.5 h-4.5 text-[#ff1b76] border-gray-300 rounded focus:ring-[#ff1b76] cursor-pointer"
                    disabled={submittingFood}
                  />
                  Is Bestseller
                </label>
              </div>

              {/* Image Uploader */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Item Image (Cloudinary Upload)
                </label>
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-[#ff1b76]/50 rounded-2xl py-6 px-4 bg-slate-50 text-center transition cursor-pointer relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={submittingFood}
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 z-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                        <span className="text-white text-xs font-bold">Replace File</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-slate-450 z-0 animate-fade-in">
                      <p className="text-xs font-bold text-slate-500">Click or Drag Image Here</p>
                      <p className="text-[10px] text-slate-400">JPG, PNG or WEBP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2">
                  <p className="text-xs font-semibold text-red-700">{formError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingFood}
                className="w-full bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-pink-500/10 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 text-sm cursor-pointer"
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

          {/* Active Food List Grid: 7 cols */}
          <section className="lg:col-span-7 bg-[#fde68a] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#ff1b76]/20 pb-4 sticky top-0 z-10 bg-[#fde68a]">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Active Menu Panel
                </h2>
                <p className="text-xs text-slate-700 mt-1 font-medium">Review, filter, or remove published items from database</p>
              </div>
              <span className="text-xs font-bold bg-white text-[#ff1b76] px-3.5 py-1.5 rounded-full border border-[#ff1b76]/10 shadow-sm">
                {foodItems.length} items
              </span>
            </div>

            {listError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-xs font-semibold text-red-700">
                {listError}
              </div>
            )}

            {loadingList ? (
              <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76]"></div>
                <span className="text-xs text-slate-400 mt-3 animate-pulse">Refreshing item indexes...</span>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="border border-dashed border-slate-300 bg-white rounded-2xl py-20 text-center shadow-sm">
                <p className="text-sm text-slate-500 font-semibold">The food menu is currently empty.</p>
                <p className="text-xs text-slate-400 mt-1">Use the entry form to upload the first item.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {foodItems.map((item) => (
                  <div 
                    key={item._id} 
                    className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col justify-between hover:border-[#ff1b76]/30 hover:shadow-md transition duration-200"
                  >
                    <div className="space-y-3">
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-50 border border-gray-150 flex items-center justify-center">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.src = 'https://placehold.co/300x200?text=Food+Image' }} 
                        />
                        {/* Upper right side absolute badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${item.isVeg !== false ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {item.isVeg !== false ? 'Veg' : 'Non-Veg'}
                          </span>
                          {item.isBestseller && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#fde68a] text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                              Bestseller
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {item.category || 'General'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-805 truncate">{item.name}</h3>
                        <p className="text-[11px] text-slate-500 leading-normal line-clamp-2 min-h-[32px]">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-3">
                      <span className="text-sm font-extrabold text-[#ff1b76]">₹{item.price}</span>
                      <button
                        onClick={() => handleDeleteFood(item._id, item.name)}
                        disabled={actionLoadingId === item._id}
                        className="bg-red-55/10 hover:bg-red-500 border border-red-100 hover:border-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
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
          <section className="bg-white border border-[#fff0f6] rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Received Client Orders
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitor live order streams, review purchased quantities, and advance statuses
              </p>
            </div>

            {ordersError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2">
                <p className="text-xs font-semibold text-red-700">{ordersError}</p>
              </div>
            )}

            {adminOrdersLoading ? (
              <div className="py-20 text-center text-slate-500 font-medium">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76] mx-auto mb-3"></div>
                Loading orders database...
              </div>
            ) : adminOrders.length === 0 ? (
              <div className="border border-dashed border-slate-350 rounded-2xl py-20 text-center">
                <p className="text-sm text-slate-500 font-bold">No orders received yet.</p>
                <p className="text-xs text-slate-400 mt-1">Live requests from active teams will populate here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-150 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55/60 text-slate-600 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Placement Date</th>
                      <th className="px-6 py-4">Active Team</th>
                      <th className="px-6 py-4">Delicacies List</th>
                      <th className="px-6 py-4">Total Price</th>
                      <th className="px-6 py-4 text-center">Payment Proof</th>
                      <th className="px-6 py-4">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {adminOrders.map((order) => {
                      const formattedDate = new Date(order.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={order._id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="block text-slate-900 font-extrabold">{formattedDate}</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">ID: {order._id}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3.5 py-1.5 bg-[#fde68a] text-amber-950 rounded-full text-xs font-black">
                              {order.teamName}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-sm">
                            <ul className="space-y-1 text-xs">
                              {order.items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-slate-500 font-black">x{it.quantity}</span>
                                  <span className="text-slate-800 font-bold">{it.name}</span>
                                  <span className="text-slate-400 font-bold">(₹{it.price})</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#ff1b76] font-black text-sm">
                            INR {order.totalAmount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-650 text-center">
                            {order.transactionId ? (
                              <div className="space-y-1 text-center">
                                <span className="block font-black text-slate-900 tracking-tight">TXN: {order.transactionId}</span>
                                {order.paymentScreenshot && (
                                  <a 
                                    href={order.paymentScreenshot} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-block text-[#ff1b76] hover:underline text-[10px] uppercase font-black tracking-wider"
                                  >
                                    View Screenshot ↗
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Terminal Cash/Pay</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                              className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-all ${
                                order.status === 'Accepted'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
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
          <section className="bg-white border border-[#fff0f6] rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Payment Settings & Setup
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure scan-to-pay QR codes and enable/disable the manual upload payment checks
              </p>
            </div>

            {paymentError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
                <p className="text-xs font-semibold text-red-700">{paymentError}</p>
              </div>
            )}

            {paymentLoading ? (
              <div className="py-16 text-center text-slate-500 font-medium">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff1b76] mx-auto mb-3"></div>
                Syncing settings...
              </div>
            ) : (
              <form onSubmit={handleSavePaymentConfig} className="space-y-6">
                
                {/* 1. Toggle Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-fade-in">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">QR Code Payment Flow</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Force user checkout through qr scan, screenshot uploads, and unique transaction check
                    </p>
                  </div>
                  
                  {/* On/Off Switch Button */}
                  <button
                    type="button"
                    onClick={() => setPaymentConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
                      paymentConfig.isActive ? 'bg-[#ff1b76]' : 'bg-slate-300'
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
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                    Current QR Code Image
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* View QR Code */}
                    <div className="w-40 h-40 border border-slate-200 rounded-2xl flex items-center justify-center p-2 bg-slate-55/30 overflow-hidden relative shrink-0">
                      {paymentQrPreview ? (
                        <img src={paymentQrPreview} className="w-full h-full object-contain rounded-xl animate-fade-in" alt="Preview QR" />
                      ) : paymentConfig.qrCodeUrl ? (
                        <img src={paymentConfig.qrCodeUrl} className="w-full h-full object-contain rounded-xl" alt="Active QR" />
                      ) : (
                        <div className="text-center p-3 text-[10px] text-slate-400 font-bold">
                          No QR Code uploaded
                        </div>
                      )}
                    </div>

                    {/* Edit QR Code file button */}
                    <div className="space-y-2 flex-grow text-center sm:text-left">
                      <p className="text-xs text-slate-500 font-bold">Upload New QR Code Image</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Replace current barcode image with a new UPI or scan scanner. JPEGs/PNGs up to 5MB supported.
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
                        className="px-4 py-2 border border-slate-355 hover:bg-slate-50 text-[#2d3748] rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Choose QR Code
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Action Place Submit */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  {paymentQrPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentQrFile(null);
                        setPaymentQrPreview('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      disabled={updatingPayment}
                    >
                      Clear Changes
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    disabled={updatingPayment}
                    className="bg-[#ff1b76] hover:bg-[#e21163] text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {updatingPayment ? 'Saving settings...' : 'Save Settings'}
                  </button>
                </div>

              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
