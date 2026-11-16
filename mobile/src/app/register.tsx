// app/register.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE_URL = 'https://harmonyapp.us/api';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRegister = async () => {
    if (password.length < 8) {
      setMessage('Error: Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match.');
      return;
    }
    if (!nickname.trim()) {
      setMessage('Error: Enter a display name.');
      return;
    }
    setLoading(true);
    setMessage('Creating account and sending verification code...');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), nickname: nickname.trim(), email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setStep('verify');
      setCooldown(60);
      setMessage('Account created. Check your email for the verification code.');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage('Verifying code...');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      setMessage('Email verified. Returning to sign in...');
      setTimeout(() => router.replace('/'), 1200);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setMessage('Resending verification code...');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not resend verification code');
      setCooldown(60);
      setMessage('New verification code sent. Check your email.');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{step === 'register' ? 'Create an account' : 'Verify your email'}</Text>

        {step === 'register' ? (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={20} />

            <Text style={styles.label}>Display name</Text>
            <TextInput style={styles.input} value={nickname} onChangeText={setNickname} maxLength={32} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Password (minimum 8 characters)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ marginLeft: 10 }}>
                <Text style={{ color: '#00a8fc' }}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ marginLeft: 10 }}>
                <Text style={{ color: '#00a8fc' }}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={() => void handleRegister()} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Continue'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ color: '#949ba4', marginBottom: 16, textAlign: 'center' }}>
              Enter the 6-digit code sent to {email}.
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="Verification code"
              placeholderTextColor="#72767d"
            />
            <TouchableOpacity style={styles.button} onPress={() => void handleVerify()} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify Email'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setStep('register'); setCode(''); setMessage(''); setCooldown(0); }} disabled={loading}>
                <Text style={{ color: '#949ba4' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleResendCode()} disabled={loading || cooldown > 0}>
                <Text style={{ color: cooldown > 0 ? '#666' : '#00a8fc' }}>
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {message ? <Text style={{ color: message.includes('Error') ? '#f23f43' : '#23a55a', marginTop: 12, textAlign: 'center' }}>{message}</Text> : null}

        {step === 'register' && (
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#00a8fc', textAlign: 'center' }}>Back to Login</Text>
        </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202225', padding: 16 },
  card: { backgroundColor: '#313338', padding: 24, borderRadius: 8, width: '100%', maxWidth: 420 },
  title: { color: '#f2f3f5', fontSize: 22, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  label: { marginBottom: 6, fontSize: 12, fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' },
  input: { width: '100%', padding: 10, backgroundColor: '#1e1f22', borderWidth: 1, borderColor: '#111214', borderRadius: 4, color: '#f2f3f5', fontSize: 15, marginBottom: 16 },
  button: { backgroundColor: '#5865F2', padding: 12, borderRadius: 4, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '500' }
});