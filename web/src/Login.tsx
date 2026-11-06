import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Logging in...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      setMessage('Success! Welcome to Harmony.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  // Reusable Eye Icon component for clean toggling
  const renderEyeIcon = (isOpen: boolean) => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      {isOpen ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      )}
    </svg>
  );

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
      background: 'linear-gradient(135deg, #202225 0%, #36393f 40%, #5865F2 100%)',
      margin: 0, padding: 0, overflow: 'hidden', boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#313338', padding: '36px 32px', borderRadius: '8px',
        width: '480px', maxWidth: '90vw', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '54px', height: '54px', backgroundColor: '#5865F2', borderRadius: '16px',
            margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '700', fontSize: '26px'
          }}>
            H
          </div>
          <h2 style={{ color: '#f2f3f5', marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
            Welcome back!
          </h2>
          <p style={{ color: '#949ba4', fontSize: '14px' }}>
            We're so excited to see you again!
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
              Username or Email <span style={{ color: '#f23f43' }}>*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
              Password <span style={{ color: '#f23f43' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {renderEyeIcon(showPassword)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '3px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}
          >
            Log In
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '15px', fontSize: '14px', color: message.includes('Error') ? '#f23f43' : '#23a55a', textAlign: 'center' }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#949ba4' }}>
          Need an account? <span style={{ color: '#00a8fc', cursor: 'pointer' }} onClick={() => navigate('/register')}>Register</span>
        </div>
      </div>
    </div>
  );
}
