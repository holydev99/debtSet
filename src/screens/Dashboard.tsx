import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Platform, Pressable, Modal, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import * as Notifications from 'expo-notifications';

export default function Dashboard({ onGoToHistory }: { onGoToHistory: () => void }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(''); 
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    checkPermissions();
    fetchDebts();
  }, []);

  async function checkPermissions() {
    if (Platform.OS === 'web') return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  }

  async function fetchDebts() {
    const { data } = await supabase.from('debts').select('*').eq('is_paid', false).order('created_at', { ascending: false });
    if (data) {
      setDebts(data);
      setTotal(data.reduce((acc, item) => acc + Number(item.amount), 0));
    }
  }

  async function scheduleNotification(debtId: string, debtTitle: string, dueDate: Date) {
    if (Platform.OS === 'web') return;
    const trigger = new Date(dueDate);
    trigger.setHours(9, 0, 0, 0);
    if (trigger <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💸 Debt Reminder",
        body: `Time to pay back: ${debtTitle}`,
        data: { debtId },
      },
      trigger: { date: trigger } as Notifications.NotificationTriggerInput,
    });
  }

  async function cancelNotification(debtId: string) {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.debtId === debtId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
  }

  async function addDebt() {
    if (!title || !amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('debts').insert([{ 
      title, 
      amount: parseFloat(amount), 
      description,
      payback_date: date.toISOString(), 
      user_id: user?.id, 
      is_paid: false 
    }]).select();

    if (!error && data) {
      await scheduleNotification(data[0].id, title, date);
      resetForm();
      fetchDebts();
    }
  }

  async function markAsPaid(id: string) {
    const { error } = await supabase.from('debts').update({ 
        is_paid: true, 
        paid_at: new Date().toISOString() 
    }).eq('id', id);

    if (!error) {
      await cancelNotification(id);
      fetchDebts();
    }
  }

  const resetForm = () => {
    setTitle(''); setAmount(''); setDescription(''); setDate(new Date()); setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <MotiView from={{ height: 0 }} animate={{ height: 260 }} style={styles.header}>
        <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Active Debts</Text>
            <Pressable onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></Pressable>
        </View>
        <MotiText key={total} from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.headerAmount}>
          ${total.toFixed(2)}
        </MotiText>
      </MotiView>

      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }} // Extra padding for buttons
        renderItem={({ item, index }) => (
          <MotiView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ delay: index * 50 }} 
            style={styles.card}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              <Text style={styles.tagText}>📅 Due {new Date(item.payback_date).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardAmount}>${item.amount}</Text>
              <Pressable onPress={() => markAsPaid(item.id)}>
                {({ pressed }) => (
                  <MotiView animate={{ scale: pressed ? 0.9 : 1, backgroundColor: '#000' }} style={styles.miniPaidBtn}>
                    <Text style={styles.miniPaidText}>PAID</Text>
                  </MotiView>
                )}
              </Pressable>
            </View>
          </MotiView>
        )}
      />

      {/* --- SEPARATED ANIMATED ACTIONS --- */}
      
      {/* 1. Center History Pill */}
      <View style={styles.historyContainer} pointerEvents="box-none">
        <Pressable onPress={onGoToHistory}>
          {({ pressed }) => (
            <MotiView 
              from={{ opacity: 0, translateY: 50 }}
              animate={{ 
                opacity: 1, 
                translateY: 0,
                scale: pressed ? 0.92 : 1 
              }}
              style={styles.historyPill}
            >
              <Text style={styles.historyText}>VIEW HISTORY</Text>
            </MotiView>
          )}
        </Pressable>
      </View>

      {/* 2. Corner Add Button */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <Pressable onPress={() => setModalVisible(true)}>
          {({ pressed }) => (
            <MotiView 
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: 1, 
                scale: pressed ? 0.85 : 1,
                rotate: pressed ? '45deg' : '0deg'
              }}
              style={styles.fab}
            >
              <Text style={styles.fabText}>+</Text>
            </MotiView>
          )}
        </Pressable>
      </View>

      {/* ADD DEBT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <MotiView from={{ translateY: 300 }} animate={{ translateY: 0 }} style={styles.modalContent}>
            <Text style={styles.modalHeader}>New Entry</Text>
            <TextInput style={styles.input} placeholder="Name" value={title} onChangeText={setTitle} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Notes" value={description} onChangeText={setDescription} placeholderTextColor="#999" />
            <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
              <Text style={{color: '#000'}}>Date: {date.toLocaleDateString()}</Text>
            </Pressable>
            {showPicker && <DateTimePicker value={date} mode="date" display="spinner" onChange={(e, d) => { setShowPicker(false); if(d) setDate(d); }} />}
            <Pressable onPress={addDebt}>
                {({ pressed }) => (
                    <MotiView animate={{ scale: pressed ? 0.96 : 1 }} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Save Debt</Text>
                    </MotiView>
                )}
            </Pressable>
            <Pressable onPress={resetForm}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', position: 'absolute', top: 60, paddingHorizontal: 30 },
  headerTitle: { color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  logoutText: { color: '#FF3B30', fontWeight: '700', fontSize: 12 },
  headerAmount: { color: '#fff', fontSize: 55, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 22, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f2f2f2', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#000' },
  cardDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  tagText: { color: '#aaa', fontSize: 11, marginTop: 6, fontWeight: '600' },
  cardAmount: { fontSize: 24, fontWeight: '900', color: '#000' },
  miniPaidBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, marginTop: 8 },
  miniPaidText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // --- SEPARATE BUTTON POSITIONS ---
  historyContainer: { position: 'absolute', bottom: 45, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  historyPill: { 
    backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, 
    borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 
  },
  historyText: { fontSize: 12, fontWeight: '800', color: '#000', letterSpacing: 1 },

  fabContainer: { position: 'absolute', bottom: 40, right: 25, zIndex: 11 },
  fab: { 
    width: 60, height: 60, backgroundColor: '#000', borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 50 },
  modalHeader: { fontSize: 24, fontWeight: '900', marginBottom: 20 },
  input: { backgroundColor: '#f7f7f7', padding: 20, borderRadius: 18, marginBottom: 12, fontSize: 16 },
  primaryBtn: { backgroundColor: '#000', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancelBtnText: { textAlign: 'center', marginTop: 20, color: '#999', fontWeight: '600' }
});