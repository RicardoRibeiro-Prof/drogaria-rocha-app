import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminApp from './AdminApp';
import BulkImportModal from './BulkImportModal';
import { supabase } from './lib/supabase';

type PaymentMethod = {
  code: string;
  label: string;
  active: boolean;
  instructions: string;
  pix_key?: string | null;
  sort_order: number;
};

const C = {
  orange: '#F47A1F',
  orangeDark: '#D95F09',
  orangeSoft: '#FFF1E6',
  white: '#FFFFFF',
  black: '#111111',
  muted: '#6F6F6F',
  border: '#E5E5E5',
  bg: '#F5F5F5',
  danger: '#B42318',
};

export default function AdminRoot({ session, profile }: { session: any; profile: any }) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [adminKey, setAdminKey] = useState(0);

  return (
    <View style={{ flex: 1 }}>
      <AdminApp key={adminKey} session={session} profile={profile} />

      <Pressable style={s.importButton} onPress={() => setImportOpen(true)}>
        <Ionicons name="cloud-upload-outline" size={20} color={C.white} />
        <Text style={s.paymentButtonText}>Importar produtos</Text>
      </Pressable>

      <Pressable style={s.paymentButton} onPress={() => setOpen(true)}>
        <Ionicons name="card-outline" size={20} color={C.white} />
        <Text style={s.paymentButtonText}>Pagamentos</Text>
      </Pressable>

      <BulkImportModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setAdminKey((value) => value + 1)}
      />
      <PaymentMethodsModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function PaymentMethodsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_methods')
      .select('code,label,active,instructions,pix_key,sort_order')
      .order('sort_order');
    setLoading(false);
    if (error) return Alert.alert('Pagamentos', error.message);
    setItems((data || []) as PaymentMethod[]);
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items]);

  const updateLocal = (code: string, patch: Partial<PaymentMethod>) => {
    setItems((current) => current.map((item) => (item.code === code ? { ...item, ...patch } : item)));
  };

  const save = async (item: PaymentMethod) => {
    setSavingCode(item.code);
    const { error } = await supabase
      .from('payment_methods')
      .update({
        label: item.label.trim(),
        active: item.active,
        instructions: item.instructions.trim(),
        pix_key: item.code === 'pix' ? (item.pix_key?.trim() || null) : null,
        sort_order: item.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('code', item.code);
    setSavingCode(null);
    if (error) return Alert.alert('Pagamentos', error.message);
    Alert.alert('Salvo', `${item.label} atualizado.`);
  };

  const addCustom = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const code = `custom_${Date.now()}`;
    const nextOrder = Math.max(0, ...items.map((item) => item.sort_order || 0)) + 1;
    const { error } = await supabase.from('payment_methods').insert({
      code,
      label,
      active: true,
      instructions: '',
      sort_order: nextOrder,
    });
    if (error) return Alert.alert('Pagamentos', error.message);
    setNewLabel('');
    await load();
  };

  const removeCustom = async (item: PaymentMethod) => {
    if (!item.code.startsWith('custom_')) return;
    Alert.alert('Excluir forma de pagamento', `Excluir ${item.label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('payment_methods').delete().eq('code', item.code);
          if (error) return Alert.alert('Pagamentos', error.message);
          await load();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s.modal} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>DROGARIA ROCHA</Text>
            <Text style={s.headerTitle}>Formas de pagamento</Text>
          </View>
          <Pressable style={s.close} onPress={onClose}>
            <Ionicons name="close" size={24} color={C.white} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          <View style={s.notice}>
            <Ionicons name="information-circle-outline" size={22} color={C.orange} />
            <Text style={s.noticeText}>O cliente verá no checkout somente as formas marcadas como ativas. PIX, por enquanto, usa a chave e as instruções cadastradas aqui; cobrança automática por gateway fica para a próxima integração.</Text>
          </View>

          <Text style={s.sectionTitle}>Adicionar forma</Text>
          <View style={s.addRow}>
            <TextInput value={newLabel} onChangeText={setNewLabel} placeholder="Ex.: Convênio" placeholderTextColor="#999" style={s.addInput} />
            <Pressable style={s.addButton} onPress={addCustom}>
              <Ionicons name="add" size={20} color={C.white} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={C.orange} style={{ marginTop: 30 }} />
          ) : (
            sorted.map((item) => (
              <View key={item.code} style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.code}>{item.code.toUpperCase()}</Text>
                    <TextInput
                      value={item.label}
                      onChangeText={(value) => updateLocal(item.code, { label: value })}
                      style={s.labelInput}
                    />
                  </View>
                  <Switch value={item.active} onValueChange={(value) => updateLocal(item.code, { active: value })} />
                </View>

                {item.code === 'pix' && (
                  <View style={s.field}>
                    <Text style={s.fieldLabel}>Chave PIX</Text>
                    <TextInput
                      value={item.pix_key || ''}
                      onChangeText={(value) => updateLocal(item.code, { pix_key: value })}
                      placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      style={s.input}
                    />
                  </View>
                )}

                <View style={s.field}>
                  <Text style={s.fieldLabel}>Instruções para o cliente</Text>
                  <TextInput
                    value={item.instructions}
                    onChangeText={(value) => updateLocal(item.code, { instructions: value })}
                    placeholder="Ex.: pagamento na entrega"
                    placeholderTextColor="#999"
                    multiline
                    style={[s.input, s.multiline]}
                  />
                </View>

                <View style={s.actions}>
                  {item.code.startsWith('custom_') && (
                    <Pressable style={s.deleteButton} onPress={() => removeCustom(item)}>
                      <Ionicons name="trash-outline" size={18} color={C.danger} />
                    </Pressable>
                  )}
                  <Pressable style={s.saveButton} onPress={() => save(item)} disabled={savingCode === item.code}>
                    {savingCode === item.code ? <ActivityIndicator color={C.white} /> : <Text style={s.saveText}>Salvar</Text>}
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  importButton: { position: 'absolute', right: 16, bottom: 74, height: 46, borderRadius: 23, paddingHorizontal: 16, backgroundColor: '#177A3F', flexDirection: 'row', alignItems: 'center', gap: 7, elevation: 8 },
  paymentButton: { position: 'absolute', right: 16, bottom: 18, height: 46, borderRadius: 23, paddingHorizontal: 16, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', gap: 7, elevation: 8 },
  paymentButtonText: { color: C.white, fontWeight: '900', fontSize: 12 },
  modal: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 76, backgroundColor: '#171717', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: C.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  headerTitle: { color: C.white, fontSize: 21, fontWeight: '900', marginTop: 2 },
  close: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#2B2B2B', alignItems: 'center', justifyContent: 'center' },
  page: { padding: 16, paddingBottom: 40 },
  notice: { padding: 13, borderRadius: 15, backgroundColor: C.orangeSoft, flexDirection: 'row', gap: 9, marginBottom: 18 },
  noticeText: { flex: 1, color: '#333', fontSize: 11, lineHeight: 17 },
  sectionTitle: { color: C.black, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addInput: { flex: 1, height: 46, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, color: C.black },
  addButton: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 14, marginBottom: 11 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { fontSize: 9, fontWeight: '900', color: C.orangeDark, marginBottom: 2 },
  labelInput: { color: C.black, fontSize: 17, fontWeight: '900', paddingVertical: 2 },
  field: { marginTop: 12 },
  fieldLabel: { color: C.black, fontWeight: '900', fontSize: 11, marginBottom: 6 },
  input: { minHeight: 46, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, paddingHorizontal: 11, color: C.black },
  multiline: { minHeight: 78, paddingTop: 10, textAlignVertical: 'top' },
  actions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  deleteButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
  saveButton: { minWidth: 105, height: 44, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  saveText: { color: C.white, fontWeight: '900' },
});
