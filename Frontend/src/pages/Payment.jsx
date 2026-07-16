import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPaymentConfig, uploadPaymentScreenshot, placeOrder } from '../api';
import innovateKareLogo from '../assets/Logo.png';

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const Payment = () => {
  const { token, setCart } = useAuth();
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
    <div className="min-h-screen bg-[#F7E8CC] text-[#3B1D14] font-sans pb-20 transition-colors duration-300">
      
      {/* Top Header Navbar */}
      <header className="bg-[#FFF6E5] border-b border-[#EED9B7] sticky top-0 z-40 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src={innovateKareLogo} className="h-14 w-auto object-contain" alt="Logo" />
          </div>
          <button 
            type="button"
            onClick={() => navigate('/cart')}
            className="text-[#4A1F12] hover:text-[#C96F42] text-xs sm:text-sm font-semibold transition duration-150 cursor-pointer"
          >
            ← Back to Cart
          </button>
        </div>
      </header>

      {/* Main Payment Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (col-span-8): Payment QR Scan and Submission */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Step 1: QR SCAN DETAILS & PROOF */}
            <div className="bg-[#FFF6E5] rounded-3xl shadow-md border border-[#EED9B7] overflow-hidden">
              {/* Header */}
              <div className="bg-[#C96F42] px-5 py-4 flex items-center gap-4 text-[#FFF8ED]">
                <span className="h-5 w-5 bg-[#FFF6E5] text-[#C96F42] rounded-md text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-black uppercase tracking-wider font-sans">
                  PAYMENT QR SCAN & PROOF
                </h2>
              </div>

              {/* Form Body */}
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* QR Image Display */}
                  <div className="space-y-3 text-center">
                    <label className="block text-xs font-black uppercase text-[#8A6858] tracking-wider">
                      Scan Cafeteria Payment QR
                    </label>
                    
                    <div className="w-52 h-52 mx-auto border-2 border-dashed border-[#D9B58C] rounded-2xl flex items-center justify-center p-2 bg-[#F7E8CC]/45 overflow-hidden shadow-xs">
                      {loadingConfig ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-[#C96F42] border-t-transparent animate-spin"></div>
                          <span className="text-[10px] text-[#8A6858]">Loading terminal QR...</span>
                        </div>
                      ) : qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          className="w-full h-full object-contain rounded-xl" 
                          alt="Terminal UPI QR" 
                        />
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-xs text-[#8A6858] font-bold">Cafeteria QR Offline</p>
                          <p className="text-[9px] text-[#8A6858]/85 mt-1">Please pay at counter terminal.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screenshot & URN Inputs */}
                  <div className="space-y-4">
                    
                    {/* Unique URN ID Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase text-[#8A6858] tracking-wider">
                        Unique Transaction URN / Transaction ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter unique transaction URN number"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full px-4 py-3 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C96F42] focus:border-[#C96F42] transition text-sm font-semibold text-[#3B1D14]"
                        disabled={submittingOrder}
                      />
                    </div>

                    {/* Screenshot File Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase text-[#8A6858] tracking-wider">
                        Screenshot Confirmation Receipt
                      </label>
                      
                      <div className="flex flex-col items-center">
                        {screenshotPreview ? (
                          <div className="relative w-full h-28 rounded-xl overflow-hidden border border-[#D9B58C] bg-[#FFF6E5]">
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
                            className="w-full py-5 border border-dashed border-[#D9B58C] hover:border-[#C96F42] rounded-xl flex flex-col items-center justify-center gap-1 transition bg-[#F7E8CC]/30 hover:bg-[#F7E8CC]/55 cursor-pointer"
                          >
                            <svg className="h-5 w-5 text-[#8A6858]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-[11px] font-bold text-[#8A6858]">Upload transaction screenshot</span>
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
                  <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-red-800">{errorMsg}</p>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-4 border-t border-[#EED9B7]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-[#8A6858]">
                    Your receipt screenshot will be verified by the cafeteria kitchen supervisor immediately.
                  </span>
                  
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="bg-[#C96F42] text-[#FFF8ED] font-extrabold text-sm uppercase tracking-wider px-10 py-3.5 rounded-xl shadow-lg shadow-amber-900/10 cursor-pointer hover:bg-[#B85C38] transition flex items-center gap-2 shrink-0 disabled:opacity-75"
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

          {/* Right Column: Price Details Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#FFF6E5] rounded-3xl shadow-md border border-[#EED9B7] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#EED9B7] bg-[#EED9B7]/40">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#4A1F12]">
                  Price Details
                </h3>
              </div>

              <div className="p-6 space-y-4 text-sm font-semibold text-[#8A6858]">
                {/* Items Total */}
                <div className="flex justify-between items-center">
                  <span>Price ({totalItemCount} items)</span>
                  <span className="text-[#3B1D14] font-bold">{formatMoney(totalAmount)}</span>
                </div>

                {/* Delivery Charges */}
                <div className="flex justify-between items-center">
                  <span>Delivery Charges</span>
                  <span className="text-[#C96F42] font-black uppercase text-xs">FREE</span>
                </div>

                {/* Total amount boundary */}
                <div className="border-t border-dashed border-[#EED9B7] pt-4 flex justify-between items-center text-[#4A1F12] font-extrabold text-base font-serif-cafe">
                  <span>Total Payable</span>
                  <span className="text-[#4A1F12] font-black">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Safety Badges */}
            <div className="flex items-center gap-3 text-[#8A6858] text-[11px] font-semibold p-2">
              <svg className="h-6 w-6 text-[#C96F42] shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
