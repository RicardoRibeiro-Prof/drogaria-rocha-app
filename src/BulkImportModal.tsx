import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';

type ImportRow = {
  code: string;
  name: string;
  description: string;
  category: string;
  price: number;
  badge: string;
  active: boolean;
  image_url: string | null;
  line: number;
};

type ParsedFile = {
  rows: ImportRow[];
  invalid: { line: number; reason: string }[];
  duplicates: number;
};

const C = {
  orange: '#F47A1F', orangeDark: '#D95F09', orangeSoft: '#FFF1E6', white: '#FFFFFF',
  black: '#111111', muted: '#6F6F6F', border: '#E5E5E5', bg: '#F5F5F5',
  success: '#177A3F', danger: '#B42318', dark: '#171717',
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '');
}

function detectSeparator(line: string) {
  return (line.match(/;/g) || []).length >= (line.match(/,/g) || []).length ? ';' : ',';
}

function parseCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parsePrice(value: string) {
  const raw = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return NaN;
  if (raw.includes(',') && raw.includes('.')) return Number(raw.replace(/\./g, '').replace(',', '.'));
  if (raw.includes(',')) return Number(raw.replace(',', '.'));
  return Number(raw);
}

function parseActive(value: string) {
  const normalized = normalizeHeader(String(value || 'sim'));
  return !['nao', 'false', '0', 'inativo', 'n'].includes(normalized);
}

function columnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseCsv(content: string): ParsedFile {
  const clean = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos um produto.');

  const separator = detectSeparator(lines[0]);
  const headers = parseCsvLine(lines[0], separator).map(normalizeHeader);
  const idx = {
    code: columnIndex(headers, ['codigo', 'code', 'sku', 'cod', 'codigoproduto']),
    name: columnIndex(headers, ['nome', 'name', 'produto', 'descricaoitem']),
    description: columnIndex(headers, ['descricao', 'description', 'detalhes']),
    category: columnIndex(headers, ['categoria', 'category', 'grupo', 'departamento']),
    price: columnIndex(headers, ['preco', 'price', 'valor', 'precovenda']),
    badge: columnIndex(headers, ['selo', 'badge', 'destaque']),
    active: columnIndex(headers, ['ativo', 'active', 'situacao', 'status']),
    image: columnIndex(headers, ['imagem', 'image', 'imageurl', 'imagemurl', 'urlimagem']),
  };

  if (idx.code < 0 || idx.name < 0 || idx.category < 0 || idx.price < 0) {
    throw new Error('Cabeçalho obrigatório: codigo, nome, categoria e preco.');
  }

  const invalid: { line: number; reason: string }[] = [];
  const byCode = new Map<string, ImportRow>();
  let duplicates = 0;

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line, separator);
    const lineNumber = index + 2;
    const get = (position: number) => (position >= 0 ? String(values[position] ?? '').trim() : '');
    const code = get(idx.code);
    const name = get(idx.name);
    const category = get(idx.category);
    const price = parsePrice(get(idx.price));

    if (!code) return invalid.push({ line: lineNumber, reason: 'Código vazio' });
    if (!name) return invalid.push({ line: lineNumber, reason: 'Nome vazio' });
    if (!category) return invalid.push({ line: lineNumber, reason: 'Categoria vazia' });
    if (!Number.isFinite(price) || price < 0) return invalid.push({ line: lineNumber, reason: 'Preço inválido' });

    const row: ImportRow = {
      code,
      name,
      description: get(idx.description),
      category,
      price,
      badge: get(idx.badge),
      active: parseActive(get(idx.active)),
      image_url: get(idx.image) || null,
      line: lineNumber,
    };

    if (byCode.has(code)) duplicates += 1;
    byCode.set(code, row);
  });

  return { rows: Array.from(byCode.values()), invalid, duplicates };
}

export default function BulkImportModal({ visible, onClose, onImported }: { visible: boolean; onClose: () => void; onImported?: () => void }) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [csvText, setCsvText] = useState('');

  const summary = useMemo(() => {
    if (!parsed) return { create: 0, update: 0 };
    let update = 0;
    parsed.rows.forEach((row) => {
      if (existingCodes.has(row.code)) update += 1;
    });
    return { create: parsed.rows.length - update, update };
  }, [parsed, existingCodes]);

  const analyzeCsv = async () => {
    if (!csvText.trim()) return Alert.alert('CSV vazio', 'Cole o conteúdo da planilha CSV primeiro.');

    setAnalyzing(true);
    try {
      const next = parseCsv(csvText);
      const { data, error } = await supabase.from('products').select('code').not('code', 'is', null);
      if (error) throw error;
      setParsed(next);
      setExistingCodes(new Set((data || []).map((item: any) => String(item.code))));
    } catch (error: any) {
      setParsed(null);
      Alert.alert('Importação', error?.message || 'Não foi possível interpretar o CSV.');
    } finally {
      setAnalyzing(false);
    }
  };

  const importRows = async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);

    try {
      const payload = parsed.rows.map(({ line, ...row }) => row);
      const batchSize = 150;

      for (let start = 0; start < payload.length; start += batchSize) {
        const batch = payload.slice(start, start + batchSize);
        setProgress(`${Math.min(start + batch.length, payload.length)} de ${payload.length}`);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'code' });
        if (error) throw error;
      }

      Alert.alert(
        'Importação concluída',
        `${summary.create} produto(s) criado(s) e ${summary.update} atualizado(s).${parsed.invalid.length ? `\n${parsed.invalid.length} linha(s) ignorada(s).` : ''}`,
        [{
          text: 'OK',
          onPress: () => {
            setParsed(null);
            setCsvText('');
            setProgress('');
            onImported?.();
            onClose();
          },
        }],
      );
    } catch (error: any) {
      Alert.alert('Falha na importação', error?.message || 'Não foi possível importar os produtos.');
    } finally {
      setImporting(false);
      setProgress('');
    }
  };

  const close = () => {
    if (importing) return;
    setParsed(null);
    setCsvText('');
    setProgress('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaView style={s.modal} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>PRODUTOS</Text>
            <Text style={s.headerTitle}>Importar em massa</Text>
          </View>
          <Pressable style={s.close} onPress={close} disabled={importing}>
            <Ionicons name="close" size={24} color={C.white} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          <View style={s.notice}>
            <Ionicons name="document-text-outline" size={24} color={C.orange} />
            <Text style={s.noticeText}>Abra o CSV no computador ou celular, copie o conteúdo e cole abaixo. O código identifica o produto e evita duplicidade.</Text>
          </View>

          <View style={s.formatBox}>
            <Text style={s.formatTitle}>Cabeçalho</Text>
            <Text style={s.formatText}>codigo;nome;descricao;categoria;preco;selo;ativo;imagem_url</Text>
          </View>

          <TextInput
            value={csvText}
            onChangeText={setCsvText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Cole aqui todo o conteúdo do CSV..."
            placeholderTextColor="#999"
            style={s.csvInput}
          />

          <Pressable style={s.analyzeButton} onPress={analyzeCsv} disabled={analyzing || importing}>
            {analyzing ? <ActivityIndicator color={C.white} /> : <Text style={s.analyzeText}>Analisar produtos</Text>}
          </Pressable>

          {parsed && (
            <>
              <View style={s.stats}>
                <Stat label="Válidos" value={parsed.rows.length} tone="success" />
                <Stat label="Novos" value={summary.create} />
                <Stat label="Atualizações" value={summary.update} />
                <Stat label="Com erro" value={parsed.invalid.length} tone={parsed.invalid.length ? 'danger' : 'normal'} />
              </View>

              {parsed.duplicates > 0 ? <Text style={s.warning}>{parsed.duplicates} código(s) repetido(s): será usada a última linha.</Text> : null}

              {parsed.invalid.length > 0 ? (
                <View style={s.errorBox}>
                  <Text style={s.errorTitle}>Linhas ignoradas</Text>
                  {parsed.invalid.slice(0, 8).map((item) => (
                    <Text key={`${item.line}-${item.reason}`} style={s.errorText}>Linha {item.line}: {item.reason}</Text>
                  ))}
                </View>
              ) : null}

              <Text style={s.previewTitle}>Prévia</Text>
              {parsed.rows.slice(0, 8).map((row) => (
                <View key={row.code} style={s.previewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{row.name}</Text>
                    <Text style={s.meta}>{row.code} • {row.category}</Text>
                  </View>
                  <Text style={s.price}>{row.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                </View>
              ))}

              {parsed.rows.length > 8 ? <Text style={s.more}>+ {parsed.rows.length - 8} produto(s)</Text> : null}

              <Pressable style={s.importButton} onPress={importRows} disabled={importing}>
                {importing ? (
                  <><ActivityIndicator color={C.white} /><Text style={s.importText}>Importando {progress}</Text></>
                ) : (
                  <><Ionicons name="cloud-upload-outline" size={20} color={C.white} /><Text style={s.importText}>Confirmar importação</Text></>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'success' | 'danger' }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, tone === 'success' && { color: C.success }, tone === 'danger' && { color: C.danger }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  modal: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 76, backgroundColor: C.dark, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: C.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  headerTitle: { color: C.white, fontSize: 21, fontWeight: '900', marginTop: 2 },
  close: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#2B2B2B', alignItems: 'center', justifyContent: 'center' },
  page: { padding: 16, paddingBottom: 42 },
  notice: { padding: 13, borderRadius: 15, backgroundColor: C.orangeSoft, flexDirection: 'row', gap: 9, marginBottom: 14 },
  noticeText: { flex: 1, color: '#333', fontSize: 11, lineHeight: 17 },
  formatBox: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 13, marginBottom: 12 },
  formatTitle: { fontSize: 12, fontWeight: '900', color: C.black },
  formatText: { fontSize: 10, color: C.orangeDark, fontWeight: '800', marginTop: 7 },
  csvInput: { minHeight: 170, maxHeight: 280, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, padding: 12, textAlignVertical: 'top', fontSize: 10, color: C.black },
  analyzeButton: { height: 48, borderRadius: 13, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  analyzeText: { color: C.white, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stat: { width: '48%', minHeight: 78, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 11 },
  statValue: { fontSize: 21, fontWeight: '900', color: C.black },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '800', marginTop: 4 },
  warning: { marginTop: 10, color: C.orangeDark, backgroundColor: C.orangeSoft, borderRadius: 11, padding: 10, fontSize: 10, lineHeight: 15 },
  errorBox: { marginTop: 10, borderRadius: 13, backgroundColor: '#FDECEC', padding: 11 },
  errorTitle: { color: C.danger, fontWeight: '900', fontSize: 11, marginBottom: 5 },
  errorText: { color: '#6B2520', fontSize: 10, lineHeight: 15 },
  previewTitle: { fontSize: 16, fontWeight: '900', color: C.black, marginTop: 18, marginBottom: 8 },
  previewRow: { minHeight: 58, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 11, marginBottom: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  productName: { fontSize: 12, fontWeight: '900', color: C.black },
  meta: { fontSize: 9, color: C.muted, marginTop: 3 },
  price: { fontSize: 12, color: C.black, fontWeight: '900' },
  more: { textAlign: 'center', color: C.muted, fontSize: 10, marginTop: 5 },
  importButton: { height: 52, borderRadius: 14, backgroundColor: C.success, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  importText: { color: C.white, fontWeight: '900' },
});