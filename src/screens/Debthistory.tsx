import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import { MotiView } from 'moti';

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<Debt[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('is_paid', true)
      .order('paid_at', { ascending: false });

    if (data) setHistory(data);
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Archive</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item, index }) => (
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: index * 50 }}
            style={styles.card}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.paidDate}>Paid on {new Date(item.paid_at!).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.amount}>${item.amount}</Text>
          </MotiView>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20, backgroundColor: '#fff' },
  backBtn: { color: '#888', fontWeight: '700', marginBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#000' },
  card: { 
    backgroundColor: '#F9F9F9', borderRadius: 24, padding: 20, marginBottom: 12, 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' 
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  paidDate: { fontSize: 12, color: '#999', marginTop: 4 },
  amount: { fontSize: 20, fontWeight: '900', color: '#34C759' } // Green for paid
});