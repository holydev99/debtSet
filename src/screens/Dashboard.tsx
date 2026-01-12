import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, ScrollView, Platform 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import * as Notifications from 'expo-notifications';

// Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paybackDate, setPaybackDate] = useState(''); // Format: YYYY-MM-DD

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
    if (!user) return;

    const newDebt = {
      title,
      amount: parseFloat(amount),
      description,
      payback_date: paybackDate ? new Date(paybackDate).toISOString() : null,
      user_id: user.id,
      is_paid: false
    };

    const { error } = await supabase.from('debts').insert([newDebt]);

    if (!error) {
      // Schedule notification if a date exists (Mobile only)
      if (paybackDate && Platform.OS !== 'web') {
        scheduleNotification(title, new Date(paybackDate));
      }

      resetForm();
      fetchDebts();
    }
  }

  async function markAsPaid(id: string) {
    const { error } = await supabase
      .from('debts')
      .update({ 
        is_paid: true, 
        paid_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (!error) fetchDebts();
  }

  async function scheduleNotification(debtTitle: string, date: Date) {
    const trigger = new Date(date);
    trigger.setHours(9, 0, 0); // Remind at 9:00 AM on the due date

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💸 Debt Reminder",
        body: `Don't forget to pay back: ${debtTitle}`,
      },
      trigger: {
      date: trigger, 
    } as Notifications.NotificationTriggerInput,
    });
  }

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDescription('');
    setPaybackDate('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* 1. HEADER */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL YOU OWE</Text>
        <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
      </View>

      {/* 2. LIST */}
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.debtCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.debtTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.debtDesc}>{item.description}</Text> : null}
              <Text style={styles.debtDate}>
                Due: {item.payback_date ? new Date(item.payback_date).toLocaleDateString() : 'No date set'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.debtAmount}>${Number(item.amount).toFixed(2)}</Text>
              <TouchableOpacity style={styles.payButton} onPress={() => markAsPaid(item.id)}>
                <Text style={styles.payButtonText}>Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>You're all caught up! ✨</Text>}
      />

      {/* 3. FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 4. MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>New Debt</Text>
            
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.input} placeholder="Description (Optional)" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Due Date (YYYY-MM-DD)" value={paybackDate} onChangeText={setPaybackDate} />

            <TouchableOpacity style={styles.saveButton} onPress={addDebt}>
              <Text style={styles.saveButtonText}>Save Debt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingHorizontal: 20 },
  totalCard: { 
    backgroundColor: '#000', padding: 35, borderRadius: 28, 
    marginTop: 60, marginBottom: 25, alignItems: 'center' 
  },
  totalLabel: { color: '#8E8E93', fontSize: 12, fontWeight: 'bold' },
  totalAmount: { color: '#FFF', fontSize: 44, fontWeight: '800', marginTop: 5 },
  debtCard: {
    backgroundColor: '#FFF', padding: 20, borderRadius: 20, 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15
  },
  debtTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  debtDesc: { fontSize: 14, color: '#666', marginTop: 2 },
  debtDate: { fontSize: 12, color: '#8E8E93', marginTop: 8 },
  debtAmount: { fontSize: 18, fontWeight: '800', color: '#FF3B30' },
  payButton: { backgroundColor: '#34C759', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginTop: 10 },
  payButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8E8E93' },
  fab: {
    position: 'absolute', bottom: 40, right: 30, backgroundColor: '#000', 
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center'
  },
  fabText: { color: '#FFF', fontSize: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 12, marginBottom: 12 },
  saveButton: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
  cancelText: { textAlign: 'center', marginTop: 20, color: '#FF3B30' }
});