import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match.');
      return;
    }

    setMessage('Creating account and sending verification code...');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      setMessage('Account created! Please check your email for the 6-digit verification code.');
      setStep(2);
      setCooldown(30);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Verifying code...');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');

      setMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    
    setMessage('Resending verification code...');
    setTimeout(() => {
      setMessage('New verification code sent! Check your email.');
      setCooldown(30);
    }, 500);
  };

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
      margin: 0, padding: 0, overflowY: 'auto', boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#313338', padding: '36px 32px', borderRadius: '8px',
        width: '480px', maxWidth: '90vw', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box', margin: '40px 0'
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
            {step === 1 ? 'Create an account' : 'Verify Your Email'}
          </h2>
          <p style={{ color: '#949ba4', fontSize: '14px' }}>
            {step === 1 ? "We're excited to have you join us!" : `Enter the code sent to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                Display Name <span style={{ color: '#f23f43' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                Username <span style={{ color: '#f23f43' }}>*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                Email <span style={{ color: '#f23f43' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                Confirm Password <span style={{ color: '#f23f43' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 40px 10px 12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#f2f3f5', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: '#b5bac1' }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {renderEyeIcon(showConfirmPassword)}
                </span>
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '3px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ width: '100%', padding: '12px', backgroundColor: '#1e1f22', border: '1px solid #111214', borderRadius: '3px', color: '#fff', boxSizing: 'border-box', textAlign: 'center', fontSize: '22px', letterSpacing: '6px', outline: 'none' }}
                required
              />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#23a55a', color: 'white', border: 'none', borderRadius: '3px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
              Verify Email
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); setMessage(''); setCooldown(0); }}
                style={{ background: 'none', border: 'none', color: '#949ba4', fontSize: '13px', cursor: 'pointer', padding: 0 }}
              >
                &larr; Back to registration
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0}
                style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#666' : '#00a8fc', fontSize: '13px', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', padding: 0 }}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {message && (
          <p style={{ marginTop: '15px', fontSize: '14px', color: message.includes('Error') ? '#f23f43' : '#23a55a', textAlign: 'center' }}>
            {message}
          </p>
        )}

        {step === 1 && (
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#949ba4' }}>
            Already have an account? <span style={{ color: '#00a8fc', cursor: 'pointer' }} onClick={() => navigate('/login')}>Log In</span>
          </div>
        )}
      </div>
    </div>
  );
}
