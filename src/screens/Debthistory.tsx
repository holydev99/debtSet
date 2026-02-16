import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Pressable, Modal, Alert 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Debt } from '../types/database';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

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

  async function deleteHistoryItem(id: string) {
    Alert.alert("Delete Permanently", "This record will be gone forever.", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await supabase.from('debts').delete().eq('id', id);
          setDetailVisible(false);
          fetchHistory();
      }}
    ]);
  }

  async function markAsUnpaid(id: string) {
    const { error } = await supabase.from('debts')
      .update({ 
        is_paid: false, 
        paid_at: null,
        notification_id: null // Reset notif so user can re-set it if they want
      })
      .eq('id', id);

    if (!error) {
      setDetailVisible(false);
      fetchHistory();
      Alert.alert("Restored", "Debt moved back to active list.");
    }
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtnRow}>
          <Ionicons name="arrow-back" size={24} color="#888" />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Archive</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => { setSelectedDebt(item); setDetailVisible(true); }}>
            <MotiView 
              from={{ opacity: 0, translateY: 10 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              transition={{ delay: index * 50 }}
              style={styles.card}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.paidDate}>Paid {new Date(item.paid_at!).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.amount}>${item.amount}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ddd" style={{ marginLeft: 10 }} />
            </MotiView>
          </Pressable>
        )}
      />

      {/* DETAIL MODAL */}
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <MotiView from={{ translateY: 300 }} animate={{ translateY: 0 }} style={styles.modalContent}>
            {selectedDebt && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeader}>Details</Text>
                  <Pressable onPress={() => deleteHistoryItem(selectedDebt.id)}>
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </Pressable>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>TITLE</Text>
                  <Text style={styles.infoValue}>{selectedDebt.title}</Text>
                  
                  <Text style={[styles.infoLabel, {marginTop: 15}]}>AMOUNT</Text>
                  <Text style={styles.infoValue}>${selectedDebt.amount}</Text>

                  <Text style={[styles.infoLabel, {marginTop: 15}]}>NOTES</Text>
                  <Text style={styles.infoValue}>{selectedDebt.description || "No notes added."}</Text>
                </View>

                <Pressable onPress={() => markAsUnpaid(selectedDebt.id)} style={styles.restoreBtn}>
                    <Text style={styles.restoreBtnText}>Mark as Unpaid</Text>
                </Pressable>
                
                <Pressable onPress={() => setDetailVisible(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20 },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtnText: { color: '#888', fontWeight: '700', marginLeft: 5 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#000' },
  card: { 
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 12, 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f2f2f2' 
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  paidDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: '#34C759' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, minHeight: 450 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalHeader: { fontSize: 24, fontWeight: '900' },
  infoBox: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 20, marginBottom: 30 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#bbb', letterSpacing: 1 },
  infoValue: { fontSize: 18, fontWeight: '600', color: '#000', marginTop: 2 },
  restoreBtn: { backgroundColor: '#000', padding: 20, borderRadius: 20, alignItems: 'center' },
  restoreBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  closeBtnText: { textAlign: 'center', marginTop: 20, color: '#999', fontWeight: '600' }
});