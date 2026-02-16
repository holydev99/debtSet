import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, Platform, 
  Pressable, Modal, Alert, Switch, KeyboardAvoidingView, ScrollView 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import { MotiView, MotiText } from 'moti';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons'; 

// 1. GLOBAL NOTIFICATION CONFIG
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

export default function Dashboard({ onGoToHistory }: { onGoToHistory: () => void }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  
  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(''); 
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    configureNotifications();
    fetchDebts();
  }, []);

  async function configureNotifications() {
    if (Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert("Permission Required", "Reminders won't work unless notifications are enabled in your phone settings.");
    }
  }

  async function fetchDebts() {
    const { data } = await supabase.from('debts')
      .select('*')
      .eq('is_paid', false)
      .order('created_at', { ascending: false });
    if (data) {
      setDebts(data);
      setTotal(data.reduce((acc, item) => acc + Number(item.amount), 0));
    }
  }

  // 2. FIXED NOTIFICATION LOGIC - ONLY SCHEDULES FOR THE CORRECT DAY
  async function scheduleNotification(debtTitle: string, dueDate: Date) {
    if (Platform.OS === 'web') return null;
    
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const now = new Date();
    // Use getTime to ensure we are working with a fresh instance
    const triggerDate = new Date(dueDate.getTime());

    const isToday = triggerDate.toDateString() === now.toDateString();
    let finalTrigger: Date;
    let bodyText = "";

    if (isToday) {
      // If it's today, we set it for 10 seconds from now so you see it works
      finalTrigger = new Date(now.getTime() + 10000);
      bodyText = `💸 Payment due TODAY for: ${debtTitle}`;
    } else {
      // 1. Set the trigger to ONE DAY BEFORE the due date
      triggerDate.setDate(triggerDate.getDate() - 1);
      // 2. Set the time to exactly 9:00 AM
      triggerDate.setHours(9, 0, 0, 0);

      // 3. Logic Check: If "yesterday at 9am" is already in the past, 
      // it means the debt is due tomorrow. In this case, schedule for 10 seconds from now.
      if (triggerDate.getTime() <= now.getTime()) {
        finalTrigger = new Date(now.getTime() + 10000);
        bodyText = `⚠️ Reminder: ${debtTitle} is due TOMORROW!`;
      } else {
        finalTrigger = triggerDate;
        bodyText = `📅 Reminder: ${debtTitle} is due tomorrow!`;
      }
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Debt Set Reminder",
          body: bodyText,
          sound: true,
        },
        trigger: {
          date: finalTrigger,
        } as Notifications.NotificationTriggerInput,
      });
      console.log(`Notification scheduled for: ${finalTrigger.toLocaleString()} with ID: ${id}`);
      return id;
    } catch (e) {
      console.error("Scheduling Error:", e);
      return null;
    }
  }

  async function cancelNotification(notifId: string | null) {
    if (notifId && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch (e) {
        console.error("Cancel Error:", e);
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function addDebt() {
    if (!title || !amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const notifId = await scheduleNotification(title, date);

    const { error } = await supabase.from('debts').insert([{ 
      title, 
      amount: parseFloat(amount), 
      description,
      payback_date: date.toISOString(), 
      user_id: user?.id, 
      is_paid: false,
      notification_id: notifId
    }]);

    if (!error) {
      resetForm();
      fetchDebts();
    } else {
      Alert.alert("Error", error.message);
    }
  }

  async function toggleNotification(debt: Debt) {
    if (debt.notification_id) {
      await cancelNotification(debt.notification_id);
      await supabase.from('debts').update({ notification_id: null }).eq('id', debt.id);
    } else {
      const newId = await scheduleNotification(debt.title, new Date(debt.payback_date));
      if (newId) {
        await supabase.from('debts').update({ notification_id: newId }).eq('id', debt.id);
      }
    }
    fetchDebts();
    setDetailModalVisible(false);
  }

  async function markAsPaid(debt: Debt) {
    await cancelNotification(debt.notification_id);
    const { error } = await supabase.from('debts').update({ 
        is_paid: true, 
        paid_at: new Date().toISOString(),
        notification_id: null 
    }).eq('id', debt.id);

    if (!error) {
      setDetailModalVisible(false);
      fetchDebts();
    }
  }

  async function deleteDebt(debt: Debt) {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await cancelNotification(debt.notification_id);
          await supabase.from('debts').delete().eq('id', debt.id);
          setDetailModalVisible(false);
          fetchDebts();
      }}
    ]);
  }

  const resetForm = () => {
    setTitle(''); setAmount(''); setDescription(''); setDate(new Date()); setAddModalVisible(false);
  };

  const openDetails = (debt: Debt) => {
    setSelectedDebt(debt);
    setDetailModalVisible(true);
  };

  return (
    <View style={styles.container}>
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
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => openDetails(item)}>
            <MotiView 
              from={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: index * 50 }} 
              style={styles.card}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.tagText}>📅 Due {new Date(item.payback_date).toLocaleDateString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cardAmount}>${item.amount}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" style={{ marginLeft: 10 }} />
              </View>
            </MotiView>
          </Pressable>
        )}
      />

      <View style={styles.historyContainer} pointerEvents="box-none">
        <Pressable onPress={onGoToHistory}>
          <MotiView style={styles.historyPill} animate={{ scale: 1 }}>
            <Text style={styles.historyText}>VIEW HISTORY</Text>
          </MotiView>
        </Pressable>
      </View>

      <View style={styles.fabContainer} pointerEvents="box-none">
        <Pressable onPress={() => setAddModalVisible(true)}>
          <MotiView style={styles.fab} animate={{ scale: 1 }}>
            <Ionicons name="add" size={32} color="white" />
          </MotiView>
        </Pressable>
      </View>

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <MotiView style={styles.modalContent}>
            {selectedDebt && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeader}>{selectedDebt.title}</Text>
                  <Pressable onPress={() => deleteDebt(selectedDebt)}>
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </Pressable>
                </View>
                <Text style={styles.detailPrice}>${selectedDebt.amount}</Text>
                <Text style={styles.detailDesc}>{selectedDebt.description || "No description provided."}</Text>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsText}>Reminders</Text>
                  <Switch 
                    value={!!selectedDebt.notification_id} 
                    onValueChange={() => toggleNotification(selectedDebt)}
                    trackColor={{ false: "#eee", true: "#000" }}
                  />
                </View>
                <Pressable onPress={() => markAsPaid(selectedDebt)} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Mark as Paid</Text>
                </Pressable>
                <Pressable onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </MotiView>
        </View>
      </Modal>

      <Modal visible={addModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalHeader}>New Debt</Text>
                <TextInput style={styles.input} placeholder="Who do you owe?" value={title} onChangeText={setTitle} placeholderTextColor="#999" />
                <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholderTextColor="#999" />
                <TextInput style={[styles.input, { height: 100 }]} placeholder="Notes (Optional)" value={description} onChangeText={setDescription} multiline placeholderTextColor="#999" />
                <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                  <Text style={{ color: '#000' }}>Due Date: {date.toLocaleDateString()}</Text>
                </Pressable>
                {showPicker && (
                  <DateTimePicker 
                    value={date} 
                    mode="date" 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                    onChange={(e, d) => { setShowPicker(false); if(d) setDate(d); }} 
                  />
                )}
                <Pressable onPress={addDebt} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Save Debt</Text>
                </Pressable>
                <Pressable onPress={resetForm}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', position: 'absolute', top: 60, paddingHorizontal: 30 },
  headerTitle: { color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: 12 },
  logoutText: { color: '#FF3B30', fontWeight: '700', fontSize: 12 },
  headerAmount: { color: '#fff', fontSize: 55, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  tagText: { color: '#aaa', fontSize: 12, marginTop: 4 },
  cardAmount: { fontSize: 20, fontWeight: '800' },
  fabContainer: { position: 'absolute', bottom: 40, right: 25 },
  fab: { width: 64, height: 64, backgroundColor: '#000', borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  historyContainer: { position: 'absolute', bottom: 45, left: 0, right: 0, alignItems: 'center' },
  historyPill: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: '#eee', elevation: 3 },
  historyText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalHeader: { fontSize: 28, fontWeight: '900' },
  detailPrice: { fontSize: 40, fontWeight: '800', color: '#000', marginBottom: 10 },
  detailDesc: { fontSize: 16, color: '#666', marginBottom: 25 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderColor: '#f0f0f0', marginBottom: 20 },
  settingsText: { fontSize: 18, fontWeight: '600' },
  input: { backgroundColor: '#f5f5f5', padding: 18, borderRadius: 15, marginBottom: 12, color: '#000', textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#000', padding: 20, borderRadius: 20, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtnText: { textAlign: 'center', marginTop: 20, color: '#999', fontWeight: '600' }
});