import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  
  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Request Code, 2 = Enter Code & New Password
  const [forgotMessage, setForgotMessage] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

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

      // Save user object and token (if returned) to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setMessage('Success! Welcome to Harmony.');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('Sending reset code...');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotMessage('If account exists, reset code sent.');
      setResetStep(2);
    } catch (err: any) {
      setForgotMessage(`Error: ${err.message}`);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('Resetting password...');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotMessage('Password reset successful! You can now log in.');
      setTimeout(() => {
        setShowForgotModal(false);
        setResetStep(1);
        setForgotMessage('');
      }, 1500);
    } catch (err: any) {
      setForgotMessage(`Error: ${err.message}`);
    }
  };

  const handleRequestVerification = async () => {
    setVerifyLoading(true);
    setVerifyMessage('Requesting verification code...');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not request a verification code.');
      setVerifyMessage('If the account exists and needs verification, a code was sent to its email.');
    } catch (error: any) {
      setVerifyMessage(`Error: ${error.message}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyMessage('Verifying email...');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail.trim(), code: verificationCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed.');
      setVerifyMessage('Email verified. You can now sign in.');
      setVerificationCode('');
    } catch (error: any) {
      setVerifyMessage(`Error: ${error.message}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  const renderEyeIcon = (isOpen: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
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
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', background: 'linear-gradient(135deg, #202225 0%, #36393f 40%, #5865F2 100%)', margin: 0, padding: 0, overflow: 'hidden' }}>
      <div style={{ backgroundColor: '#313338', padding: '36px 32px', borderRadius: '8px', width: '480px', maxWidth: '90vw', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '54px', height: '54px', backgroundColor: '#5865F2', borderRadius: '16px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '26px' }}>
            H
          </div>
          <h2 style={{ color: '#f2f3f5', marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>Welcome back!</h2>
          <p style={{ color: '#949ba4', fontSize: '14px' }}>We're so excited to see you again!</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
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

          <div style={{ marginBottom: '8px' }}>
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
              <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}>
                {renderEyeIcon(showPassword)}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <span onClick={() => setShowForgotModal(true)} style={{ color: '#00a8fc', fontSize: '13px', cursor: 'pointer' }}>Forgot your password?</span>
          </div>

          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '3px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
            Log In
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '15px', fontSize: '14px', color: message.includes('Error') ? '#f23f43' : '#23a55a', textAlign: 'center' }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#949ba4', textAlign: 'center' }}>
          Need an account? <span style={{ color: '#00a8fc', cursor: 'pointer' }} onClick={() => navigate('/register')}>Register</span>
        </div>
        <div style={{ marginTop: '10px', fontSize: '13px', textAlign: 'center' }}>
          <span
            style={{ color: '#00a8fc', cursor: 'pointer' }}
            onClick={() => {
              setVerifyEmail(identifier.includes('@') ? identifier : '');
              setVerificationCode('');
              setVerifyMessage('');
              setShowVerifyModal(true);
            }}
          >
            Verify an existing account
          </span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#313338', padding: '32px', borderRadius: '8px', width: '420px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '12px' }}>Reset Password</h3>
            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset}>
                <p style={{ color: '#949ba4', fontSize: '13px', marginBottom: '16px' }}>Enter your account email to receive a 6-digit reset code.</p>
                <input type="email" placeholder="Email address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', marginBottom: '16px', outline: 'none' }} required />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ backgroundColor: '#5865F2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Send Code</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset}>
                <p style={{ color: '#949ba4', fontSize: '13px', marginBottom: '16px' }}>Enter the 6-digit code and your new password (min 8 chars).</p>
                <input type="text" maxLength={6} placeholder="6-digit code" value={resetCode} onChange={(e) => setResetCode(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', marginBottom: '12px', outline: 'none' }} required />
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input type={showResetPassword ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} required />
                  <span onClick={() => setShowResetPassword(!showResetPassword)} style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}>
                    {renderEyeIcon(showResetPassword)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ backgroundColor: '#23a55a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Update Password</button>
                </div>
              </form>
            )}

            {forgotMessage && <p style={{ marginTop: '12px', fontSize: '13px', color: forgotMessage.includes('Error') ? '#f23f43' : '#23a55a' }}>{forgotMessage}</p>}
          </div>
        </div>
      )}
      {showVerifyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#313338', padding: '32px', borderRadius: '8px', width: '420px', maxWidth: '90vw', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#f2f3f5', marginBottom: '12px' }}>Verify Email</h3>
            <form onSubmit={handleConfirmVerification}>
              <p style={{ color: '#949ba4', fontSize: '13px', marginBottom: '16px' }}>Use the code from your email, or request a new one if needed.</p>
              <input type="email" placeholder="Email address" value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', marginBottom: '12px', outline: 'none' }} required />
              <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '4px', color: '#fff', marginBottom: '16px', outline: 'none', textAlign: 'center', letterSpacing: '5px' }} required />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => void handleRequestVerification()} disabled={verifyLoading || !verifyEmail.trim()} style={{ background: 'none', border: 'none', color: '#00a8fc', cursor: 'pointer' }}>{verifyLoading ? 'Sending…' : 'Resend Code'}</button>
                <button type="submit" disabled={verifyLoading} style={{ backgroundColor: '#23a55a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{verifyLoading ? 'Verifying…' : 'Verify Email'}</button>
              </div>
              <button type="button" onClick={() => setShowVerifyModal(false)} disabled={verifyLoading} style={{ background: 'none', border: 'none', color: '#949ba4', cursor: 'pointer', marginTop: '12px' }}>Close</button>
            </form>
            {verifyMessage && <p style={{ marginTop: '12px', fontSize: '13px', color: verifyMessage.startsWith('Error:') ? '#f23f43' : '#23a55a' }}>{verifyMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}