import { useNotesV2 } from '@/hooks/use-notes-v2';
import { useSubjects } from '@/hooks/use-subjects';
import { useVaultSettings } from '@/hooks/use-vault-settings';
import { buildFrontmatter, parseFrontmatter } from '@/utils/md-flashcards';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VAULT_DIR = FileSystem.documentDirectory + 'ObsidianVault/';

export default function VaultSyncScreen() {
  const { vaultEnabled, enableVault, disableVault } = useVaultSettings();
  const { notes, createNote, updateNote, getNoteById, reload } = useNotesV2();
  const { subjects } = useSubjects();

  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastExportCount, setLastExportCount] = useState<number | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{ created: number; updated: number } | null>(null);

  const subjectsMap = new Map(subjects.map(s => [s.id, s.name]));

  // Sanitise a string for use as a filename or folder name
  const safeName = (s: string) =>
    s.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 100) || 'Без названия';

  // ─── ENABLE VAULT ────────────────────────────────────────────────────────────
  const handleEnable = useCallback(async () => {
    try {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
      await enableVault();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать папку vault');
    }
  }, [enableVault]);

  // ─── EXPORT ──────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    setLastExportCount(null);
    try {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
      let count = 0;

      for (const note of notes) {
        const subjectName = note.subject_id ? subjectsMap.get(note.subject_id) : undefined;
        const dir = VAULT_DIR + (subjectName ? safeName(subjectName) + '/' : '');
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

        let tagsArr: string[] = [];
        if (note.tags) {
          try { tagsArr = JSON.parse(note.tags) as string[]; } catch {}
        }

        const frontmatter = buildFrontmatter({
          title: note.title || 'Без названия',
          tags: tagsArr,
          subject: subjectName,
          created: note.created_at.split('T')[0],
          updated: note.updated_at.split('T')[0],
        });

        const filename = safeName(note.title || `note_${note.id}`) + '.md';
        const uri = dir + filename;
        await FileSystem.writeAsStringAsync(uri, frontmatter + note.body, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        count++;
      }

      setLastExportCount(count);
    } catch (e) {
      Alert.alert('Ошибка экспорта', String(e));
    } finally {
      setExporting(false);
    }
  }, [notes, subjectsMap]);

  // ─── SYNC (IMPORT) ───────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setLastSyncResult(null);
    let created = 0;
    let updated = 0;

    try {
      // Collect all .md files recursively
      const mdFiles: string[] = [];
      const collect = async (dir: string) => {
        const items = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
        for (const item of items) {
          const fullPath = dir + item;
          const info = await FileSystem.getInfoAsync(fullPath);
          if (info.isDirectory) {
            await collect(fullPath + '/');
          } else if (item.endsWith('.md')) {
            mdFiles.push(fullPath);
          }
        }
      };
      await collect(VAULT_DIR);

      for (const filePath of mdFiles) {
        const raw = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const parsed = parseFrontmatter(raw);
        const title = parsed.title || filePath.split('/').pop()?.replace('.md', '') || 'Без названия';
        const body = parsed.body;
        const subject = parsed.subject
          ? subjects.find(s => s.name === parsed.subject)
          : undefined;
        const tagsJson = parsed.tags && parsed.tags.length > 0
          ? JSON.stringify(parsed.tags)
          : undefined;

        // Check if a note with this title already exists
        const existing = notes.find(
          n => n.title === title && (!subject || n.subject_id === subject?.id)
        );

        if (existing) {
          // Update only if the file's updated_at is newer
          const fileUpdated = parsed.updated || new Date().toISOString().split('T')[0];
          const dbUpdated = existing.updated_at.split('T')[0];
          if (fileUpdated > dbUpdated) {
            updateNote(
              existing.id,
              title,
              body,
              subject?.id,
              existing.folder_id ?? undefined,
              parsed.tags
            );
            updated++;
          }
        } else {
          createNote(title, body, subject?.id, undefined, parsed.tags ?? undefined);
          created++;
        }
      }

      setLastSyncResult({ created, updated });
      reload();
    } catch (e) {
      Alert.alert('Ошибка синхронизации', String(e));
    } finally {
      setSyncing(false);
    }
  }, [notes, subjects, createNote, updateNote, reload]);

  // ─── DISABLE ─────────────────────────────────────────────────────────────────
  const handleDisable = useCallback(() => {
    Alert.alert(
      'Отключить vault sync?',
      'Папка ObsidianVault останется на устройстве, но синхронизация будет отключена.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отключить', style: 'destructive', onPress: disableVault },
      ]
    );
  }, [disableVault]);

  // ─── ONBOARDING VIEW ─────────────────────────────────────────────────────────
  if (!vaultEnabled) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Obsidian Vault</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.onboardingContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-outline" size={56} color="#C89153" />
          </View>

          <Text style={styles.onboardingTitle}>Синхронизация с Obsidian</Text>
          <Text style={styles.onboardingDesc}>
            Ваши заметки будут сохраняться как .md файлы в папку на iPhone, совместимую с Obsidian.
          </Text>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Как настроить iCloud синхронизацию:</Text>
            {[
              'Нажмите «Включить» ниже — создастся папка ObsidianVault',
              'Зайдите в Настройки → [Ваше имя] → iCloud → Показать все',
              'Найдите StudyOrganizer и включите переключатель',
              'Папка появится в iCloud Drive → StudyOrganizer',
              'В Obsidian: Open vault from folder → выберите эту папку',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={20} color="#000" />
            <Text style={styles.enableBtnText}>Включить iCloud Vault</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── MAIN VIEW ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Obsidian Vault</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Vault включён</Text>
          </View>
          <Text style={styles.statusPath}>
            Files → StudyOrganizer → ObsidianVault/
          </Text>
        </View>

        {/* Export */}
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Экспорт заметок</Text>
          <Text style={styles.actionCardDesc}>
            Все заметки сохранятся в папку ObsidianVault как .md файлы с YAML-заголовком, совместимым с Obsidian.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, exporting && styles.actionBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#000" />
            )}
            <Text style={styles.actionBtnText}>
              {exporting ? 'Экспортируем...' : `Экспортировать все (${notes.length})`}
            </Text>
          </TouchableOpacity>
          {lastExportCount !== null && (
            <View style={styles.resultRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.resultText}>Экспортировано: {lastExportCount} заметок</Text>
            </View>
          )}
        </View>

        {/* Sync / Import */}
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Синхронизировать</Text>
          <Text style={styles.actionCardDesc}>
            Читает .md файлы из ObsidianVault и создаёт или обновляет заметки в приложении.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary, syncing && styles.actionBtnDisabled]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator color="#C89153" size="small" />
            ) : (
              <Ionicons name="sync-outline" size={18} color="#C89153" />
            )}
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>
              {syncing ? 'Синхронизируем...' : 'Синхронизировать'}
            </Text>
          </TouchableOpacity>
          {lastSyncResult !== null && (
            <View style={styles.resultRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.resultText}>
                Создано: {lastSyncResult.created}, обновлено: {lastSyncResult.updated}
              </Text>
            </View>
          )}
        </View>

        {/* iCloud setup hint */}
        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={20} color="#C89153" style={styles.hintIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hintTitle}>Настройка iCloud синхронизации</Text>
            <Text style={styles.hintText}>
              Чтобы папка автоматически синхронизировалась с iCloud: Настройки → [Имя] → iCloud → Показать все → StudyOrganizer → включить.
            </Text>
            <Text style={[styles.hintText, { marginTop: 8 }]}>
              Затем в Obsidian выберите «Open vault from folder» и укажите папку StudyOrganizer в iCloud Drive.
            </Text>
          </View>
        </View>

        {/* Disable */}
        <TouchableOpacity style={styles.disableBtn} onPress={handleDisable} activeOpacity={0.8}>
          <Text style={styles.disableBtnText}>Отключить vault sync</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: { width: 44, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },

  // Onboarding
  onboardingContent: { padding: 24, paddingBottom: 48 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  onboardingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'serif',
    marginBottom: 12,
  },
  onboardingDesc: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  stepsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    gap: 14,
  },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C89153',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#000' },
  stepText: { fontSize: 14, color: '#ccc', flex: 1, lineHeight: 20 },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C89153',
    borderRadius: 16,
    paddingVertical: 18,
  },
  enableBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },

  // Main view
  mainContent: { padding: 16, paddingBottom: 48 },
  statusCard: {
    backgroundColor: '#1a2a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a4a2a',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  statusText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
  statusPath: { fontSize: 12, color: '#666', marginTop: 4 },
  actionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  actionCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8, fontFamily: 'serif' },
  actionCardDesc: { fontSize: 13, color: '#888', lineHeight: 19, marginBottom: 14 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C89153',
    borderRadius: 12,
    paddingVertical: 13,
  },
  actionBtnSecondary: { backgroundColor: '#1a1a2a', borderWidth: 1, borderColor: '#C89153' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  actionBtnTextSecondary: { color: '#C89153' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  resultText: { fontSize: 13, color: '#4CAF50' },
  hintCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a1a',
  },
  hintIcon: { marginTop: 2, flexShrink: 0 },
  hintTitle: { fontSize: 14, fontWeight: '600', color: '#C89153', marginBottom: 6 },
  hintText: { fontSize: 13, color: '#888', lineHeight: 19 },
  disableBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a1a1a',
    borderRadius: 12,
  },
  disableBtnText: { fontSize: 14, color: '#E25A2C' },
});
