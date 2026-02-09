import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase'; 
import AuthScreen from './src/screens/AuthScreen';
import Dashboard from './src/screens/Dashboard'; 
import DebtHistory from './src/screens/Debthistory';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'history'>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'dashboard' ? (
        <Dashboard onGoToHistory={() => setCurrentScreen('history')} />
      ) : (
        <DebtHistory onBack={() => setCurrentScreen('dashboard')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});