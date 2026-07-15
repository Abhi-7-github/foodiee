import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPaymentConfig, uploadPaymentScreenshot, placeOrder } from '../api';
import kareLogo from '../assets/CB-KARE.jpeg';
import innovateKareLogo from '../assets/innovate-kare-logo.svg';

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const Payment = () => {
  const { team, token, setCart } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve cart details from routing state
  const { items, totalAmount, isCartCheckout, removeFoodId } = location.state || {
    items: [],
    totalAmount: 0,
    isCartCheckout: false,
    removeFoodId: null,
  };

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Count items
  const totalItemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/dashboard');
    }
  }, [items, navigate]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const data = await fetchPaymentConfig();
        if (data.config) {
          setQrCodeUrl(data.config.qrCodeUrl || '');
        }
      } catch (err) {
        console.error('Failed to load payment config', err.message);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!screenshotFile) {
      setErrorMsg('Please upload a screenshot of your transaction confirmation.');
      return;
    }
    if (!transactionId.trim()) {
      setErrorMsg('Please enter the Unique Transaction ID.');
      return;
    }

    try {
      setSubmittingOrder(true);
      const uploadRes = await uploadPaymentScreenshot(screenshotFile, token);
      const secureScreenshotUrl = uploadRes.imageUrl;

      await placeOrder(items, token, transactionId.trim(), secureScreenshotUrl);

      alert('Order placed successfully! Redirecting to order history log.');

      if (isCartCheckout) {
        setCart({});
      } else if (removeFoodId) {
        setCart((prev) => {
          const copy = { ...prev };
          delete copy[removeFoodId];
          return copy;
        });
      }
      navigate('/orders');
    } catch (err) {
      setErrorMsg(err.message || 'Payment submission failed. Check URN and try again.');
    } finally {
      setSubmittingOrder(false);
    }
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
          <button 
            onClick={() => navigate('/cart')}
            className="text-[#2d3748] hover:text-[#ff1b76] text-sm font-semibold transition duration-150 cursor-pointer"
          >
            ← Back to Cart
          </button>
        </div>
      </header>

      {/* Main Payment Layout (Flipkart 2-Column Grid) */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (col-span-8): Flipkart Checkout Progress Steps */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Step 1: LOGIN Status (Collapsed / Verified state) */}
            <div className="bg-white rounded-sm shadow-xs border border-slate-200 p-4 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <span className="h-5 w-5 bg-slate-100 text-slate-500 rounded-sm text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    LOGIN <span className="text-blue-600 lowercase font-medium">✓</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {team?.teamName || 'Active Student Team'} <span className="text-slate-400 font-medium ml-2">+91 9398779899</span>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/cart')}
                className="text-xs font-bold text-blue-600 border border-slate-200 px-4 py-2 hover:bg-slate-50 rounded-sm uppercase"
              >
                Change
              </button>
            </div>

            {/* Step 2: DELIVERY ADDRESS / LOCATION (Simulated) */}
            <div className="bg-white rounded-sm shadow-xs border border-slate-200 p-4">
              <div className="flex items-start gap-4">
                <span className="h-5 w-5 bg-slate-100 text-slate-500 rounded-sm text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    DELIVERY SITE
                  </h3>
                  <p className="text-xs font-bold text-slate-805 mt-1">
                    Innovate Campus Cafeteria, KARE
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Krishnan Kovil, Virudhunagar, Tamil Nadu - 626126
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: QR SCAN DETAILS & PROOF (Active) */}
            <div className="bg-white rounded-sm shadow-xs border border-slate-200 overflow-hidden">
              {/* Active Blue Header */}
              <div className="bg-[#2874f0] px-4 py-3 flex items-center gap-4 text-white">
                <span className="h-5 w-5 bg-white text-[#2874f0] rounded-sm text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-black uppercase tracking-wider">
                  PAYMENT QR SCAN & PROOF
                </h2>
              </div>

              {/* Active Form Body */}
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* QR Image Display */}
                  <div className="space-y-3 text-center">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                      Scan Cafeteria Payment QR
                    </label>
                    
                    <div className="w-52 h-52 mx-auto border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-2 bg-slate-50 overflow-hidden shadow-xs">
                      {loadingConfig ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-[#2874f0] border-t-transparent animate-spin"></div>
                          <span className="text-[10px] text-slate-400">Loading terminal QR...</span>
                        </div>
                      ) : qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          className="w-full h-full object-contain rounded-xl" 
                          alt="Terminal UPI QR" 
                        />
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-xs text-slate-405 font-bold">Cafeteria QR Offline</p>
                          <p className="text-[9px] text-slate-350 mt-1">Please pay at counter terminal.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screenshot & URN Inputs */}
                  <div className="space-y-4">
                    
                    {/* Unique URN ID Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase text-slate-505 tracking-wider">
                        Unique Transaction URN / Transaction ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter unique transaction URN number"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-55/30 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874f0] transition text-sm font-semibold text-slate-800"
                        disabled={submittingOrder}
                      />
                    </div>

                    {/* Screenshot File Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase text-slate-505 tracking-wider">
                        Screenshot Confirmation Receipt
                      </label>
                      
                      <div className="flex flex-col items-center">
                        {screenshotPreview ? (
                          <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <img 
                              src={screenshotPreview} 
                              className="w-full h-full object-cover" 
                              alt="Receipt Screenshot" 
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setScreenshotFile(null);
                                setScreenshotPreview('');
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md flex items-center justify-center cursor-pointer transition hover:bg-red-600"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById('paymentScreenshotInput').click()}
                            className="w-full py-5 border border-dashed border-slate-300 hover:border-[#2874f0] rounded-lg flex flex-col items-center justify-center gap-1 transition bg-slate-55/40 cursor-pointer"
                          >
                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-[11px] font-bold text-slate-500">Upload transaction screenshot</span>
                          </button>
                        )}
                        
                        <input
                          id="paymentScreenshotInput"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={submittingOrder}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
                    <p className="text-xs font-semibold text-red-700">{errorMsg}</p>
                  </div>
                )}

                {/* Submit Action (Flipkart Orange Place Order Button) */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-450">
                    Your receipt screenshot will be verified by the cafeteria kitchen supervisor immediately.
                  </span>
                  
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="bg-[#fb641b] text-white font-extrabold text-sm uppercase tracking-wider px-10 py-3.5 rounded-sm shadow-sm cursor-pointer hover:bg-[#f35912] transition flex items-center gap-2 shrink-0 disabled:opacity-75"
                  >
                    {submittingOrder ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"></div>
                        <span>Placing...</span>
                      </>
                    ) : (
                      <span>Place Order</span>
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>

          {/* Right Column (col-span-4): Flipkart Price Details Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-sm shadow-xs border border-slate-202 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Price Details
                </h3>
              </div>

              <div className="p-6 space-y-4 text-sm font-semibold text-slate-600">
                {/* Items Total */}
                <div className="flex justify-between items-center">
                  <span>Price ({totalItemCount} items)</span>
                  <span className="text-slate-905 font-bold">{formatMoney(totalAmount)}</span>
                </div>

                {/* Delivery Charges */}
                <div className="flex justify-between items-center">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                </div>

                {/* Total amount boundary */}
                <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center text-slate-900 font-extrabold text-base">
                  <span>Total Payable</span>
                  <span className="text-slate-905">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Safety Badges */}
            <div className="flex items-center gap-3 text-slate-450 text-[11px] font-semibold p-2">
              <svg className="h-6 w-6 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.9L10 1.154 17.834 4.9a1 1 0 01.616.92v5.18c0 4.8-3.3 9.3-8 10.3a10.2 10.2 0 01-.9 0 9.8 9.8 0 01-8-10.3v-5.18a1 1 0 01.616-.92zM10 13a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 01-1-1V6a1 1 0 112 0v2a1 1 0 01-1 1z" clipRule="evenodd" />
              </svg>
              <span>Safe and Secure Payments. 100% Authentic products.</span>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};

export default Payment;
