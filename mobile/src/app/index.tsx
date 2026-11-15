// app/index.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, Scrollable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [forgotMessage, setForgotMessage] = useState('');

  const router = useRouter();

  const handleLogin = async () => {
    setMessage('Logging in...');
    try {
      const response = await fetch('https://harmonyapp.us/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
      }

      setMessage('Success! Welcome to Harmony.');
      setTimeout(() => router.replace('/dashboard'), 800);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>We're so excited to see you again!</Text>
        </View>

        <Text style={styles.label}>Username or Email *</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          placeholderTextColor="#72767d"
        />

        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={{ color: '#b5bac1' }}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setShowForgotModal(true)} style={styles.forgotLink}>
          <Text style={{ color: '#00a8fc', fontSize: 13 }}>Forgot your password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        {message ? <Text style={[styles.message, message.includes('Error') ? styles.errorText : styles.successText]}>{message}</Text> : null}

        <TouchableOpacity onPress={() => router.push('/register')} style={{ marginTop: 20 }}>
          <Text style={{ color: '#949ba4', textAlign: 'center', fontSize: 14 }}>
            Need an account? <Text style={{ color: '#00a8fc' }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ color: '#f2f3f5', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Reset Password</Text>
            {resetStep === 1 ? (
              <>
                <Text style={{ color: '#949ba4', fontSize: 13, marginBottom: 16 }}>Enter your account email to receive a 6-digit reset code.</Text>
                <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#72767d" value={forgotEmail} onChangeText={setForgotEmail} />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity onPress={() => setShowForgotModal(false)}><Text style={{ color: '#fff', padding: 8 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.smallButton} onPress={() => setResetStep(2)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Send Code</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor="#72767d" maxLength={6} value={resetCode} onChangeText={setResetCode} />
                <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="New password" placeholderTextColor="#72767d" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity onPress={() => setShowForgotModal(false)}><Text style={{ color: '#fff', padding: 8 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#23a55a' }]} onPress={() => setShowForgotModal(false)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Update</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202225', padding: 16 },
  card: { backgroundColor: '#313338', padding: 24, borderRadius: 8, width: '100%', maxWidth: 420 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logoBox: { width: 54, height: 54, backgroundColor: '#5865F2', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { color: 'white', fontWeight: '700', fontSize: 26 },
  title: { color: '#f2f3f5', marginBottom: 6, fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#949ba4', fontSize: 14 },
  label: { marginBottom: 6, fontSize: 12, fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' },
  input: { width: '100%', padding: 10, backgroundColor: '#1e1f22', borderWidth: 1, borderColor: '#111214', borderRadius: 4, color: '#f2f3f5', fontSize: 15, marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', backgroundColor: '#1e1f22', borderWidth: 1, borderColor: '#111214', borderRadius: 4, marginBottom: 8, alignItems: 'center' },
  eyeBtn: { paddingHorizontal: 12 },
  forgotLink: { alignItems: 'flex-end', marginBottom: 20 },
  button: { backgroundColor: '#5865F2', padding: 12, borderRadius: 4, alignItems: 'center' },
  smallButton: { backgroundColor: '#5865F2', padding: 10, borderRadius: 4, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '500' },
  message: { marginTop: 15, fontSize: 14, textAlign: 'center' },
  errorText: { color: '#f23f43' },
  successText: { color: '#23a55a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#313338', padding: 24, borderRadius: 8, width: '90%', maxWidth: 400 }
});