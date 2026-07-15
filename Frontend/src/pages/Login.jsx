import React, { useState } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-[#fdfafb] px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden border border-[#fde68a] flex flex-col md:flex-row min-h-[420px]">
        
        {/* Left Side: Soft Yellow Sidebar with Bullets */}
        <div className="w-full md:w-5/12 bg-[#fde68a] p-8 flex flex-col justify-center space-y-6 border-b md:border-b-0 md:border-r border-[#fde68a]/35">
          <div>
            <span className="inline-block text-[11px] font-bold text-slate-800 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-slate-100 uppercase tracking-wide">
              Sign in required
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs font-semibold text-slate-700 mt-2 leading-relaxed">
              Please sign in to access the app.
            </p>
          </div>
          <ul className="space-y-4 text-xs font-bold text-slate-800 leading-normal">
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-white text-emerald-600 rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Use your team name to sign in</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-white text-emerald-600 rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Your cart and details are restored after sign in</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex items-center justify-center h-5 w-5 bg-white text-emerald-600 rounded-full text-[9px] shadow-sm font-black">✓</span>
              <span>Logout clears your cart here</span>
            </li>
          </ul>
        </div>

        {/* Right Side: Form Content */}
        <div className="w-full md:w-7/12 bg-white p-8 flex flex-col justify-center relative">
          
          {/* Back button on top right */}
          <button 
            type="button"
            onClick={handleBack}
            className="absolute top-6 right-6 px-4 py-1.5 border border-[#fde68a] hover:bg-slate-50 text-slate-805 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
          >
            Back
          </button>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">Login</h1>
            <p className="text-xs font-semibold text-slate-550">Enter your team name to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="teamName" 
                className="block text-xs font-bold uppercase text-slate-700 tracking-wide"
              >
                Team Name
              </label>
              <input
                id="teamName"
                type="text"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                placeholder="Enter team name"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff1b76] focus:border-[#ff1b76] transition duration-200 text-slate-850 text-sm placeholder:text-slate-400"
                disabled={submitting}
              />
            </div>

            {localError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-start gap-2">
                <p className="text-xs font-semibold text-red-700 leading-normal">
                  {localError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#ff1b76] hover:bg-[#e21163] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pink-500/20 active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
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
