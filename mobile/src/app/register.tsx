// app/register.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match.');
      return;
    }
    try {
      const response = await fetch('https://harmonyapp.us/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setMessage('Account created! Redirecting...');
      setTimeout(() => router.replace('/'), 1200);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create an account</Text>
        
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        {message ? <Text style={{ color: message.includes('Error') ? '#f23f43' : '#23a55a', marginTop: 12, textAlign: 'center' }}>{message}</Text> : null}

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#00a8fc', textAlign: 'center' }}>Back to Login</Text>
        </TouchableOpacity>
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