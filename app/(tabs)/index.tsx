import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// 枠色計算ロジック
const getWakuStyleByMaxHorses = (numStr: string, maxHorses: number) => {
  const n = parseInt(numStr);
  if (isNaN(n)) return { bg: '#eee', text: '#000', border: '#ccc' };
  const styles = [
    { bg: '#FFFFFF', text: '#000000', border: '#AAAAAA' },
    { bg: '#000000', text: '#FFFFFF', border: '#000000' },
    { bg: '#FF3333', text: '#FFFFFF', border: '#FF3333' },
    { bg: '#3333FF', text: '#FFFFFF', border: '#3333FF' },
    { bg: '#FFFF00', text: '#000000', border: '#CCCC00' },
    { bg: '#008000', text: '#FFFFFF', border: '#008000' },
    { bg: '#FFA500', text: '#FFFFFF', border: '#FFA500' },
    { bg: '#FFC0CB', text: '#000000', border: '#FFC0CB' },
  ];
  if (maxHorses <= 8) return styles[n - 1] || styles[0];
  const base = Math.floor(maxHorses / 8);
  const remainder = maxHorses % 8;
  const wakuCapacities = Array(8).fill(base);
  for (let i = 0; i < remainder; i++) wakuCapacities[7 - i] += 1;
  let currentMaxHorse = 0;
  for (let w = 0; w < 8; w++) {
    currentMaxHorse += wakuCapacities[w];
    if (n <= currentMaxHorse) return styles[w];
  }
  return styles[7];
};

const JRA_PLACES = ['札幌', '函館', '福島', '新潟', '中山', '東京', '中京', '京都', '阪神', '小倉'];
const RACE_NUMBERS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const TICKET_TYPES = [
  { label: '単勝', cols: 1 }, { label: '複勝', cols: 1 },
  { label: '馬連', cols: 2 }, { label: 'ワイド', cols: 2 },
  { label: '馬単', cols: 2 }, { label: '三連複', cols: 3 },
  { label: '三連単', cols: 3 }
];

export default function HomeScreen() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeCol, setActiveCol] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState('100');
  const [maxHorses, setMaxHorses] = useState(18);
  const [horseNames, setHorseNames] = useState({ col1: '', col2: '', col3: '' });
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [raceInfo, setRaceInfo] = useState({
    place: '中山', raceNum: '11', raceName: '', type: '単勝',
    col1: [] as string[], col2: [] as string[], col3: [] as string[]
  });

  const viewShotRef = useRef<any>(null);
  const currentType = TICKET_TYPES.find(t => t.label === raceInfo.type) || TICKET_TYPES[0];
  const HORSE_NUMBERS = Array.from({ length: maxHorses }, (_, i) => (i + 1).toString());

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) setUserIcon(result.assets[0].uri);
    } catch (err) {
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const calculateTickets = () => {
    const { col1, col2, col3, type } = raceInfo;
    let validCombinations = new Set();
    if (currentType.cols === 1) return col1.length;
    if (currentType.cols === 2) {
      col1.forEach(h1 => col2.forEach(h2 => {
        if (h1 !== h2) {
          const combo = [h1, h2].sort((a, b) => Number(a) - Number(b)).join('-');
          if (type === '馬連' || type === 'ワイド') validCombinations.add(combo);
          else validCombinations.add(`${h1}-${h2}`);
        }
      }));
    } 
    if (currentType.cols === 3) {
      col1.forEach(h1 => col2.forEach(h2 => col3.forEach(h3 => {
        if (h1 !== h2 && h1 !== h3 && h2 !== h3) {
          const combo = [h1, h2, h3].sort((a, b) => Number(a) - Number(b)).join('-');
          if (type === '三連複') validCombinations.add(combo);
          else validCombinations.add(`${h1}-${h2}-${h3}`);
        }
      })));
    }
    return validCombinations.size;
  };

  const toggleHorse = (num: string) => {
    const colKey = `col${activeCol}` as 'col1' | 'col2' | 'col3';
    const currentList = raceInfo[colKey];
    if (currentList.includes(num)) {
      setRaceInfo({ ...raceInfo, [colKey]: currentList.filter(n => n !== num) });
    } else {
      setRaceInfo({ ...raceInfo, [colKey]: [...currentList, num].sort((a, b) => Number(a) - Number(b)) });
    }
  };

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      alert('Web版ではプレビュー画像を長押し、または右クリックで保存してください。');
      return;
    }
    try {
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('エラー', '保存・共有に失敗しました。');
    }
  };

  const WatermarkBackground = () => (
    <View style={styles.watermarkContainer} pointerEvents="none">
      {Array(15).fill(0).map((_, i) => (
        <Text key={i} style={styles.watermarkText}>馬券メーカー Pro 馬券メーカー Pro 馬券メーカー Pro</Text>
      ))}
    </View>
  );

  const renderTicketHorseBlock = (colKey: 'col1' | 'col2' | 'col3', label: string) => {
    const numbers = raceInfo[colKey];
    if (numbers.length === 0) return null;
    return (
      <View style={styles.columnBlock}>
        <Text style={styles.columnLabel}>{label}</Text>
        <View style={styles.horseHorizontalList}>
          {numbers.map((num, idx) => {
            const style = getWakuStyleByMaxHorses(num, maxHorses);
            return (
              <View key={num} style={styles.horseItem}>
                <View style={[styles.ticketBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
                  <Text style={[styles.ticketBadgeText, { color: style.text }]}>{num}</Text>
                </View>
                {numbers.length === 1 && horseNames[colKey] ? <Text style={styles.horseNameInTicket}>{horseNames[colKey]}</Text> : null}
                {numbers.length > 1 && idx < numbers.length - 1 && <Text style={styles.commaText}>,</Text>}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>馬券メーカー Pro</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>1. カスタムアイコン</Text>
        <TouchableOpacity style={styles.iconPickBtn} onPress={pickImage}>
          <Text style={styles.iconPickBtnText}>{userIcon ? "アイコンを変更" : "画像を選択"}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>2. 開催日 / 競馬場 / R</Text>
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <Text>{date.toLocaleDateString('ja-JP')}</Text>
        </TouchableOpacity>
        {showDatePicker && <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />}

        <View style={styles.grid}>{JRA_PLACES.map(p => (
          <TouchableOpacity key={p} style={[styles.miniChip, raceInfo.place === p && styles.chipActive]} onPress={() => setRaceInfo({...raceInfo, place: p})}>
            <Text style={[styles.chipText, raceInfo.place === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}</View>
        <View style={styles.grid}>{RACE_NUMBERS.map(n => (
          <TouchableOpacity key={n} style={[styles.numChip, raceInfo.raceNum === n && styles.chipActive]} onPress={() => setRaceInfo({...raceInfo, raceNum: n})}>
            <Text style={[styles.chipText, raceInfo.raceNum === n && styles.chipTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}</View>

        <Text style={styles.label}>3. 出走頭数 / レース名</Text>
        <View style={styles.grid}>{[8, 10, 12, 14, 16, 18].map(h => (
          <TouchableOpacity key={h} style={[styles.numChip, maxHorses === h && styles.chipActive]} onPress={() => { setMaxHorses(h); setRaceInfo({...raceInfo, col1:[], col2:[], col3:[]}); }}>
            <Text style={[styles.chipText, maxHorses === h && styles.chipTextActive]}>{h}</Text>
          </TouchableOpacity>
        ))}</View>
        <TextInput style={styles.textInput} placeholder="レース名（例:有馬記念）" onChangeText={(t) => setRaceInfo({...raceInfo, raceName: t})} />

        <Text style={styles.label}>4. 券種 / 単価</Text>
        <View style={styles.grid}>{TICKET_TYPES.map(t => (
          <TouchableOpacity key={t.label} style={[styles.typeChip, raceInfo.type === t.label && styles.typeChipActive]} onPress={() => {
            setRaceInfo({...raceInfo, type: t.label, col1: [], col2: [], col3: []});
            setHorseNames({ col1: '', col2: '', col3: '' });
            setActiveCol(1);
          }}>
            <Text style={[styles.chipText, raceInfo.type === t.label && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}</View>
        <TextInput style={styles.textInput} value={pricePerUnit} keyboardType="numeric" onChangeText={setPricePerUnit} placeholder="金額" />

        <Text style={styles.label}>5. 馬番選択（{activeCol}列目）</Text>
        <View style={styles.tabRow}>
          {[...Array(currentType.cols)].map((_, i) => (
            <TouchableOpacity key={i} style={[styles.tab, activeCol === i + 1 && styles.tabActive]} onPress={() => setActiveCol(i + 1)}>
              <Text style={styles.tabTextActive}>{i + 1}列目 ({raceInfo[`col${i+1}` as 'col1'|'col2'|'col3'].length})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 馬名入力欄（1頭選択時のみ表示） */}
        {raceInfo[`col${activeCol}` as 'col1'|'col2'|'col3'].length === 1 && (
          <TextInput
            style={styles.horseNameInputOuter}
            placeholder={`${activeCol}列目の馬名を入力`}
            value={horseNames[`col${activeCol}` as 'col1'|'col2'|'col3']}
            onChangeText={(t) => setHorseNames({ ...horseNames, [`col${activeCol}` as 'col1'|'col2'|'col3']: t })}
          />
        )}

        <View style={styles.grid}>{HORSE_NUMBERS.map(num => (
          <TouchableOpacity key={num} style={[styles.horseChip, raceInfo[`col${activeCol}` as 'col1'|'col2'|'col3'].includes(num) && styles.horseChipActive]} onPress={() => toggleHorse(num)}>
            <Text style={raceInfo[`col${activeCol}` as 'col1'|'col2'|'col3'].includes(num) && {color: '#fff'}}>{num}</Text>
          </TouchableOpacity>
        ))}</View>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
        <View style={styles.ticket}>
          <WatermarkBackground />
          <View style={styles.ticketHeader}>
            <Text style={styles.headerText}>{date.toLocaleDateString('ja-JP')}  {raceInfo.place}  {raceInfo.raceNum}R  {raceInfo.raceName}</Text>
          </View>
          <View style={styles.ticketBody}>
            <Text style={styles.ticketTypeLabel}>{raceInfo.type}</Text>
            <View style={styles.formationArea}>
              {renderTicketHorseBlock("col1", "1列目")}
              {currentType.cols >= 2 && raceInfo.col2.length > 0 && <View style={styles.columnDivider} />}
              {renderTicketHorseBlock("col2", "2列目")}
              {currentType.cols >= 3 && raceInfo.col3.length > 0 && <View style={styles.columnDivider} />}
              {renderTicketHorseBlock("col3", "3列目")}
            </View>
          </View>
          <View style={styles.ticketFooter}>
            <View>
              <Text style={styles.calcDetail}>{calculateTickets()}点 各{pricePerUnit}円</Text>
              <Text style={styles.totalAmountText}>合計 {(calculateTickets() * (Number(pricePerUnit) || 0)).toLocaleString()} 円</Text>
            </View>
            <View style={styles.iconContainer}>{userIcon ? <Image source={{ uri: userIcon }} style={styles.userIconStyle} /> : <View style={styles.dummyQr} />}</View>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.saveBtn} onPress={handleShare}><Text style={styles.saveBtnText}>保存・共有する</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2', padding: 15, paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#1b5e20' },
  formCard: { backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 4, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#444', marginTop: 15, borderLeftWidth: 3, borderLeftColor: '#1b5e20', paddingLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  iconPickBtn: { backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  iconPickBtnText: { color: '#2e7d32', fontWeight: 'bold' },
  datePickerBtn: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  miniChip: { width: '18.5%', paddingVertical: 8, backgroundColor: '#eee', borderRadius: 5, alignItems: 'center' },
  numChip: { width: '14.5%', paddingVertical: 8, backgroundColor: '#eee', borderRadius: 5, alignItems: 'center' },
  typeChip: { width: '23.5%', paddingVertical: 8, backgroundColor: '#eee', borderRadius: 5, alignItems: 'center' },
  chipActive: { backgroundColor: '#1b5e20' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  chipText: { fontSize: 11 },
  textInput: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 10, fontSize: 15, marginTop: 5 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: 3, borderRadius: 8, marginVertical: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabTextActive: { fontSize: 12, fontWeight: 'bold' },
  horseChip: { width: '15.5%', paddingVertical: 12, backgroundColor: '#eee', borderRadius: 6, alignItems: 'center' },
  horseChipActive: { backgroundColor: '#d32f2f' },
  horseNameInputOuter: { backgroundColor: '#fff9c4', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#fbc02d', fontWeight: 'bold' },

  ticket: { backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#999', borderLeftWidth: 15, borderLeftColor: '#1b5e20', minHeight: 260, position: 'relative', overflow: 'hidden' },
  watermarkContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.04, transform: [{ rotate: '-20deg' }, { scale: 2 }], justifyContent: 'center' },
  watermarkText: { fontSize: 10, color: '#1b5e20', fontWeight: 'bold', lineHeight: 20, textAlign: 'center' },
  ticketHeader: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  headerText: { fontSize: 15, fontWeight: 'bold' },
  ticketBody: { flex: 1, marginTop: 12 },
  ticketTypeLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  formationArea: { marginTop: 5 },
  columnBlock: { marginBottom: 8, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: '#1b5e20' },
  columnLabel: { fontSize: 10, color: '#1b5e20', fontWeight: 'bold', marginBottom: 4 },
  columnDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  horseHorizontalList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  horseItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  ticketBadge: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 5, marginRight: 4 },
  ticketBadgeText: { fontWeight: 'bold', fontSize: 16 },
  horseNameInTicket: { fontSize: 18, fontWeight: 'bold', color: '#000', marginLeft: 4 },
  commaText: { fontSize: 18, fontWeight: 'bold', marginRight: 6, color: '#666' },

  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  calcDetail: { fontSize: 12, color: '#666' },
  totalAmountText: { fontSize: 20, fontWeight: 'bold' },
  iconContainer: { width: 50, height: 50 },
  userIconStyle: { width: 50, height: 50, borderRadius: 8 },
  dummyQr: { width: 50, height: 50, backgroundColor: '#333' },

  saveBtn: { backgroundColor: '#1b5e20', padding: 20, borderRadius: 15, marginTop: 15, marginBottom: 50, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});