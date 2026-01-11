import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database'; // Import db interface


export default function Dashboard() {
    // Use the < > brackets to define the type
  const [debts, setDebts] = useState<Debt[]>([]);
//   const [debts, setDebts] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchDebts();
  }, []);

  async function fetchDebts() {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('is_paid', false)
      .order('created_at', { ascending: false });

    if (data) {
      setDebts(data);
      const sum = data.reduce((acc, item) => acc + Number(item.amount), 0);
      setTotal(sum);
    }
  }

  async function addDebt() {
    if (!title || !amount) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('debts').insert([
      { 
        title, 
        amount: parseFloat(amount), 
        user_id: user?.id,
        is_paid: false 
      }
    ]);

    if (!error) {
      setTitle('');
      setAmount('');
      setModalVisible(false);
      fetchDebts(); // Refresh the list
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. THE ELEGANT HEADER */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL DEBT</Text>
        <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
      </View>

      {/* 2. THE DEBT LIST */}
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.debtCard}>
            <View>
              <Text style={styles.debtTitle}>{item.title}</Text>
              <Text style={styles.debtDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.debtAmount}>${Number(item.amount).toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No debts found. You're debt-free! ✨</Text>
        }
      />

      {/* 3. ADD BUTTON (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 4. ADD DEBT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Debt Entry</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Who/What for?" 
              value={title} 
              onChangeText={setTitle} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Amount ($)" 
              keyboardType="numeric" 
              value={amount} 
              onChangeText={setAmount} 
            />
            <TouchableOpacity style={styles.saveButton} onPress={addDebt}>
              <Text style={styles.saveButtonText}>Add Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 20 },
  totalCard: { 
    backgroundColor: '#000', 
    padding: 30, 
    borderRadius: 24, 
    marginTop: 60, 
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10
  },
  totalLabel: { color: '#8E8E93', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  totalAmount: { color: '#FFF', fontSize: 40, fontWeight: '800', marginTop: 8 },
  debtCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  debtDate: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  debtAmount: { fontSize: 18, fontWeight: '700', color: '#FF3B30' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8E8E93' },
  fab: {
    position: 'absolute', bottom: 40, right: 30,
    backgroundColor: '#000', width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', elevation: 5
  },
  fabText: { color: '#FFF', fontSize: 32, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16 },
  saveButton: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', marginTop: 20, color: '#8E8E93' }
});