import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [teamNameInput, setTeamNameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    const trimmed = teamNameInput.trim();
    if (!trimmed) {
      setLocalError('Please enter your Team Name.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmed);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Invalid Team Name. Please check your registered team name.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7E8CC] px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-3xl bg-[#FFF6E5] rounded-3xl shadow-xl overflow-hidden border border-[#EED9B7] flex flex-col md:flex-row min-h-[420px]">
        
        {/* Left Side: Soft Cream/Beige Sidebar with Highlights */}
        <div className="w-full md:w-5/12 bg-[#EED9B7] p-8 flex flex-col justify-center space-y-6 border-b md:border-b-0 md:border-r border-[#D9B58C]">
          <div>
            <span className="inline-block text-[11px] font-bold text-[#3B1D14] bg-[#FFF6E5] px-3.5 py-1.5 rounded-full shadow-sm border border-[#EED9B7] uppercase tracking-wide">
              Sign in required
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#4A1F12] tracking-tight font-serif-cafe leading-tight">
              Welcome back
            </h2>
            <p className="text-xs font-semibold text-[#8A6858] mt-2 leading-relaxed">
              Please sign in to access the app.
            </p>
          </div>
          <ul className="space-y-4 text-xs font-bold text-[#3B1D14] leading-normal">
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-[#FFF6E5] text-[#C96F42] rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Use your team name to sign in</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-[#FFF6E5] text-[#C96F42] rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Your cart and details are restored after sign in</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-[#FFF6E5] text-[#C96F42] rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Logout clears your cart here</span>
            </li>
          </ul>
        </div>

        {/* Right Side: Form Content */}
        <div className="w-full md:w-7/12 bg-[#FFF6E5] p-8 flex flex-col justify-center relative">
          
          {/* Back button on top right */}
          <button 
            type="button"
            onClick={handleBack}
            className="absolute top-6 right-6 px-4 py-1.5 border border-[#EED9B7] hover:bg-[#F7E8CC] text-[#3B1D14] font-bold rounded-xl text-xs transition duration-150 cursor-pointer shadow-sm"
          >
            Back
          </button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-serif-cafe text-[#4A1F12]">Login</h1>
            <p className="text-xs font-semibold text-[#8A6858]">Enter your team name to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="teamName" 
                className="block text-xs font-bold uppercase text-[#8A6858] tracking-wide"
              >
                Team Name
              </label>
              <input
                id="teamName"
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                placeholder="Enter team name"
                className="w-full px-4 py-3 bg-[#FFF6E5] border border-[#D9B58C] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C96F42] focus:border-[#C96F42] transition duration-200 text-[#3B1D14] text-sm placeholder:text-[#8A6858]/60"
                disabled={submitting}
              />
            </div>

            {localError && (
              <div className="bg-[#FFF6E5] border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2 shadow-sm">
                <p className="text-xs font-semibold text-red-808 leading-normal">
                  {localError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C96F42] hover:bg-[#B85C38] text-[#FFF8ED] font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-900/10 active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};

export default Login;
