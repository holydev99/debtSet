import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { MotiView, AnimatePresence } from 'moti'; // Added Moti for animations

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // A simple regex to check if email format is valid
  const validateEmail = (text: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  async function handleAuth() {
    setErrorMsg(null); // Clear errors from previous attempt

    // 1. Client-side validation (Immediate feedback)
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg("That doesn't look like a valid email.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // On web, use standard alert; on mobile, this would ideally be a UI message
        alert('Success! Check your inbox for a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      // This catches the error returned by Supabase (e.g., "Invalid login credentials")
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <MotiView 
        from={{ opacity: 0, scale: 0.9, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.card}
      >
        <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        
        {/* Animated Error Message Display */}
        <AnimatePresence>
          {errorMsg && (
            <MotiView 
              from={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              style={styles.errorBox}
            >
              <Text style={styles.errorText}>{errorMsg}</Text>
            </MotiView>
          )}
        </AnimatePresence>

        <TextInput
          style={styles.input}
          placeholder="Email (e.g., name@gmail.com)"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMsg(null); // Clear error when user types
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorMsg(null);
          }}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleAuth} 
          disabled={loading}
        >
          <MotiView
            animate={{ scale: loading ? 0.95 : 1 }}
            style={styles.buttonInner}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
            </Text>
          </MotiView>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          setIsSignUp(!isSignUp);
          setErrorMsg(null);
        }}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Switched to pure white for a cleaner look
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 32, // More rounded for modern feel
    // High-end soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '800', // Extra bold
    marginBottom: 25,
    textAlign: 'center',
    color: '#000',
    letterSpacing: -0.5,
  },
  errorBox: {
    backgroundColor: '#FFF5F5',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    overflow: 'hidden',
  },
  errorText: {
    color: '#E53E3E',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F7F7F7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 18,
    marginTop: 10,
    overflow: 'hidden',
  },
  buttonInner: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  toggleText: {
    marginTop: 25,
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});