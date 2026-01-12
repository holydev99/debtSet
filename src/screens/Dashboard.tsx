import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Platform, Pressable, Modal, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import { MotiView, MotiText } from 'moti';
import * as Notifications from 'expo-notifications';

export default function Dashboard() {
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
    if (existingStatus !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  async function fetchDebts() {
    const { data } = await supabase.from('debts').select('*').eq('is_paid', false).order('created_at', { ascending: false });
    if (data) {
      setDebts(data);
      setTotal(data.reduce((acc, item) => acc + Number(item.amount), 0));
    }
  }

  // --- AUTH LOGIC ---
  async function handleLogout() {
  const logoutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout Error:", error.message);
    }
  };

  if (Platform.OS === 'web') {
    // Standard JS confirm for Browser
    if (window.confirm("Are you sure you want to logout?")) {
      await logoutUser();
    }
  } else {
    // Native Alert for iOS/Android
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logoutUser }
    ]);
  }
}

  // --- NOTIFICATION LOGIC ---
  async function scheduleDebtNotification(debtTitle: string, dueDate: Date) {
    if (Platform.OS === 'web') return;
    const triggerDate = new Date(dueDate);
    triggerDate.setHours(9, 0, 0); 
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💸 Debt Reminder",
        body: `Time to pay back: ${debtTitle}`,
        data: { debtTitle }, 
      },
      trigger: { date: triggerDate } as Notifications.NotificationTriggerInput,
    });
  }

  async function cancelNotification(debtTitle: string) {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.debtTitle === debtTitle) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  }

  async function addDebt() {
    if (!title || !amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('debts').insert([{ 
      title, 
      amount: parseFloat(amount), 
      description,
      payback_date: date.toISOString(), 
      user_id: user?.id, 
      is_paid: false 
    }]);

    if (!error) {
      await scheduleDebtNotification(title, date);
      resetForm();
      fetchDebts();
    }
  }

  async function markAsPaid(id: string, debtTitle: string) {
    const { error } = await supabase.from('debts').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      await cancelNotification(debtTitle);
      fetchDebts();
    }
  }

  const resetForm = () => {
    setTitle(''); setAmount(''); setDescription(''); setDate(new Date()); setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* UPDATED HEADER WITH LOGOUT */}
      <MotiView from={{ height: 0 }} animate={{ height: 260 }} style={styles.header}>
        <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Total Debt</Text>
            <Pressable onPress={handleLogout}>
                {({ pressed }) => (
                    <MotiView animate={{ opacity: pressed ? 0.5 : 1 }}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </MotiView>
                )}
            </Pressable>
        </View>
        <MotiText key={total} from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.headerAmount}>
          ${total.toFixed(2)}
        </MotiText>
      </MotiView>

      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item, index }) => (
          <MotiView from={{ opacity: 0, translateX: -50 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: index * 100 }} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              <Text style={styles.tagText}>📅 {new Date(item.payback_date).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardAmount}>${item.amount}</Text>
              <Pressable onPress={() => markAsPaid(item.id, item.title)}>
                {({ pressed }) => (
                  <MotiView animate={{ scale: pressed ? 0.9 : 1, backgroundColor: pressed ? '#34C759' : '#000' }} style={styles.miniPaidBtn}>
                    <Text style={styles.miniPaidText}>DONE</Text>
                  </MotiView>
                )}
              </Pressable>
            </View>
          </MotiView>
        )}
      />

      <Pressable style={styles.fabContainer} onPress={() => setModalVisible(true)}>
        {({ pressed }) => (
          <MotiView animate={{ scale: pressed ? 0.8 : 1, rotate: pressed ? '90deg' : '45deg' }} style={styles.fab}>
            <Text style={styles.fabText}>+</Text>
          </MotiView>
        )}
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <MotiView from={{ translateY: 300 }} animate={{ translateY: 0 }} style={styles.modalContent}>
            <Text style={styles.modalHeader}>New Debt</Text>
            <TextInput style={styles.input} placeholder="Who?" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="How much?" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.input} placeholder="Description (Optional)" value={description} onChangeText={setDescription} />
            <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
              <Text style={{color: '#555'}}>Due Date: {date.toLocaleDateString()}</Text>
            </Pressable>
            {showPicker && <DateTimePicker value={date} mode="date" display='spinner' onChange={(e, d) => { setShowPicker(false); if(d) setDate(d); }} />}
            <Pressable onPress={addDebt}>
              {({ pressed }) => (
                <MotiView animate={{ scale: pressed ? 0.95 : 1 }} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Add Debt</Text>
                </MotiView>
              )}
            </Pressable>
            <Pressable onPress={resetForm}><Text style={styles.cancelBtnText}>Nevermind</Text></Pressable>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 50, borderBottomRightRadius: 50, paddingHorizontal: 30 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', position: 'absolute', top: 60, paddingHorizontal: 30, alignItems: 'center' },
  headerTitle: { color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  logoutText: { color: '#FF3B30', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  headerAmount: { color: '#fff', fontSize: 55, fontWeight: '900', marginTop: 30 },
  card: { backgroundColor: '#fff', borderRadius: 25, padding: 22, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  cardDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  tagText: { color: '#999', fontSize: 12, marginTop: 6, fontWeight: '600' },
  cardAmount: { fontSize: 24, fontWeight: '900', color: '#000' },
  miniPaidBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginTop: 10 },
  miniPaidText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  fabContainer: { position: 'absolute', bottom: 40, right: 30 },
  fab: { width: 65, height: 65, backgroundColor: '#000', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabText: { color: '#fff', fontSize: 35, transform: [{ rotate: '-45deg' }] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 35, borderTopLeftRadius: 45, borderTopRightRadius: 45, paddingBottom: 50 },
  modalHeader: { fontSize: 26, fontWeight: '900', marginBottom: 25, color: '#000' },
  input: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 18, marginBottom: 15, fontSize: 16, fontWeight: '500' },
  primaryBtn: { backgroundColor: '#000', padding: 22, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cancelBtnText: { textAlign: 'center', marginTop: 25, color: '#bbb', fontWeight: '700', fontSize: 15 }
});