import { useFlashcards } from '@/hooks/use-flashcards';
import { useNotesV2 } from '@/hooks/use-notes-v2';
import { useSubjects } from '@/hooks/use-subjects';
import { extractFlashcards, FlashcardCandidate } from '@/utils/md-flashcards';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  InputAccessoryView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';

function parseOptionalInt(value: string | string[] | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const TOOLBAR_ID = 'md-editor-toolbar';

export default function NoteEditorScreen() {
  const { colors } = useAppTheme();
  const borderColor = colors.borderSubtle;
  const elevatedSurface = colors.bgSecondary;
  const { noteId, subjectId, folderId } = useLocalSearchParams<{
    noteId?: string;
    subjectId?: string;
    folderId?: string;
  }>();

  const noteIdNum = useMemo(() => parseOptionalInt(noteId), [noteId]);
  const subjectIdParam = useMemo(() => parseOptionalInt(subjectId), [subjectId]);
  const folderIdParam = useMemo(() => parseOptionalInt(folderId), [folderId]);

  const { subjects } = useSubjects();
  const { createNote, updateNote, getNoteById } = useNotesV2();
  const { createCard } = useFlashcards();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [folderIdState, setFolderIdState] = useState<number | undefined>(undefined);

  // Manual flashcard modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');

  // Auto-cards modal
  const [showAutoCardsModal, setShowAutoCardsModal] = useState(false);
  const [autoCards, setAutoCards] = useState<FlashcardCandidate[]>([]);

  const [isPreview, setIsPreview] = useState(false);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const bodyInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const markdownPreviewStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { color: colors.textPrimary, fontSize: 16, lineHeight: 26 },
        heading1: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
        heading2: { color: colors.accent, fontSize: 20, fontWeight: '600' },
        strong: { color: colors.textPrimary, fontWeight: '700' },
        code_inline: {
          backgroundColor: colors.surface,
          color: colors.accent,
          borderRadius: 4,
        },
        fence: {
          backgroundColor: colors.surface,
          borderRadius: 8,
          padding: 12,
        },
        bullet_list: { color: colors.textPrimary },
      }),
    [colors],
  );

  const insertAtCursor = useCallback(
    (before: string, after: string = '', useWrapPlaceholder = false) => {
      const start = selection.start;
      const end = selection.end;
      const selected = body.slice(start, end);
      const middle = useWrapPlaceholder ? selected || 'текст' : selected;
      const newBody = body.slice(0, start) + before + middle + after + body.slice(end);
      setBody(newBody);
      const newPos = start + before.length + middle.length + after.length;
      setTimeout(() => {
        bodyInputRef.current?.setNativeProps({
          selection: { start: newPos, end: newPos },
        });
      }, 10);
    },
    [body, selection],
  );

  useEffect(() => {
    if (noteIdNum === undefined) {
      setTitle('');
      setBody('');
      setTagsList([]);
      setSelectedSubjectId(subjectIdParam ?? null);
      setFolderIdState(folderIdParam);
      return;
    }
    const note = getNoteById(noteIdNum);
    if (!note) {
      setTitle('');
      setBody('');
      setTagsList([]);
      setSelectedSubjectId(subjectIdParam ?? null);
      setFolderIdState(folderIdParam);
      return;
    }
    setTitle(note.title);
    setBody(note.body);
    setSelectedSubjectId(note.subject_id ?? null);
    setFolderIdState(note.folder_id ?? undefined);
    if (note.tags) {
      try {
        const arr = JSON.parse(note.tags) as unknown;
        setTagsList(Array.isArray(arr) ? arr.map((t) => String(t)) : []);
      } catch {
        setTagsList([]);
      }
    } else {
      setTagsList([]);
    }
  }, [noteIdNum, subjectIdParam, folderIdParam, getNoteById]);

  const handleAddCard = useCallback(() => {
    if (!cardFront.trim() || !cardBack.trim()) {
      Alert.alert('Ошибка', 'Заполните обе стороны карточки');
      return;
    }
    createCard(cardFront.trim(), cardBack.trim(), selectedSubjectId ?? undefined, noteIdNum);
    setCardFront('');
    setCardBack('');
    setShowCardModal(false);
    Alert.alert('Готово', 'Карточка добавлена');
  }, [cardFront, cardBack, createCard, selectedSubjectId, noteIdNum]);

  const handleExport = useCallback(async () => {
    if (!title.trim() && !body) {
      Alert.alert('Ошибка', 'Нечего экспортировать — заметка пуста');
      return;
    }
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Экспорт недоступен', 'Функция «Поделиться» не поддерживается на этом устройстве');
      return;
    }

    const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name;
    const tagsArr = tagsList;

    const now = new Date().toISOString().split('T')[0];
    const frontmatter = [
      '---',
      `title: "${(title.trim() || 'Без названия').replace(/"/g, '\\"')}"`,
      tagsArr.length > 0 ? `tags: [${tagsArr.map(t => `"${t}"`).join(', ')}]` : 'tags: []',
      subjectName ? `subject: "${subjectName}"` : null,
      `created: ${now}`,
      `updated: ${now}`,
      '---',
      '',
    ]
      .filter((l): l is string => l !== null)
      .join('\n');

    const content = frontmatter + body;
    const safeTitle = (title.trim() || 'note').replace(/[^a-zA-Zа-яёА-ЯЁ0-9_-]/g, '_').slice(0, 50);
    const filename = `${safeTitle}.md`;
    const uri = FileSystem.cacheDirectory + filename;

    try {
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: 'text/markdown', dialogTitle: 'Экспорт заметки' });
    } catch {
      Alert.alert('Ошибка', 'Не удалось экспортировать заметку');
    }
  }, [title, body, tagsList, selectedSubjectId, subjects]);

  const handleAutoCards = useCallback(() => {
    const candidates = extractFlashcards(body);
    if (candidates.length === 0) {
      Alert.alert(
        'Паттерны не найдены',
        'Выделяйте термины жирным и указывайте определение после разделителя:\n\n**Термин** - определение\n**Термин**: определение\n\nИли используйте заголовки (##) — следующий абзац станет ответом.'
      );
      return;
    }
    setAutoCards(candidates);
    setShowAutoCardsModal(true);
  }, [body]);

  const handleSaveAutoCards = useCallback(() => {
    autoCards.forEach(card => {
      createCard(card.front, card.back, selectedSubjectId ?? undefined, noteIdNum);
    });
    setShowAutoCardsModal(false);
    setAutoCards([]);
    Alert.alert('Готово', `Сохранено ${autoCards.length} карточек`);
  }, [autoCards, createCard, selectedSubjectId, noteIdNum]);

  const handleSave = useCallback(() => {
    const tags = tagsList.length > 0 ? tagsList : undefined;
    const subject_id = selectedSubjectId ?? undefined;
    if (noteIdNum !== undefined) {
      updateNote(noteIdNum, title.trim(), body, subject_id, folderIdState, tags);
    } else {
      createNote(title.trim(), body, subject_id, folderIdState, tags);
    }
    router.back();
  }, [
    body,
    createNote,
    folderIdState,
    noteIdNum,
    selectedSubjectId,
    tagsList,
    title,
    updateNote,
  ]);

  const subjectChipData = useMemo(
    () => [{ id: null as number | null, name: 'Без предмета' }, ...subjects],
    [subjects]
  );

  const selectedSubjectName = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId)?.name,
    [subjects, selectedSubjectId],
  );

  const addTagFromDraft = useCallback(() => {
    const t = tagDraft.trim().replace(/,$/, '');
    if (!t) {
      setTagDraft('');
      return;
    }
    setTagsList(prev => (prev.includes(t) ? prev : [...prev, t]));
    setTagDraft('');
  }, [tagDraft]);

  const onTagDraftChange = useCallback((text: string) => {
    if (text.endsWith(',')) {
      const part = text.slice(0, -1).trim();
      if (part) {
        setTagsList(prev => (prev.includes(part) ? prev : [...prev, part]));
      }
      setTagDraft('');
      return;
    }
    setTagDraft(text);
  }, []);

  const openAddCardFromMenu = useCallback(() => {
    setShowMenuModal(false);
    setCardFront(title.trim());
    setShowCardModal(true);
  }, [title]);

  const exportFromMenu = useCallback(() => {
    setShowMenuModal(false);
    handleExport();
  }, [handleExport]);

  const saveFromMenu = useCallback(() => {
    setShowMenuModal(false);
    handleSave();
  }, [handleSave]);

  return (
    <>
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.flex}>
          <View style={styles.headerRow}>
            <View style={styles.headerSide}>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.headerIconWrap}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              {selectedSubjectName ? (
                <Text
                  numberOfLines={1}
                  style={[styles.headerSubjectHint, { color: colors.textMuted }]}
                >
                  {selectedSubjectName}
                </Text>
              ) : null}
            </View>
            <View style={[styles.headerSide, styles.headerRightIcons]}>
              <TouchableOpacity
                onPress={() => setIsPreview((p) => !p)}
                style={styles.headerIconWrap}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isPreview ? 'create-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAutoCards}
                style={styles.headerIconWrap}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="sparkles-outline" size={20} color="#9B7ED4" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMenuModal(true)}
                style={styles.headerIconWrap}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={[
              styles.titleInput,
              { color: colors.textPrimary },
            ]}
            placeholder="Заголовок"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={500}
          />

          <View style={styles.bodyArea}>
            {!isPreview ? (
              <TextInput
                ref={bodyInputRef}
                style={[
                  styles.bodyInput,
                  { color: colors.textPrimary },
                ]}
                placeholder="Начните писать..."
                placeholderTextColor={colors.textMuted}
                value={body}
                onChangeText={setBody}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                multiline
                textAlignVertical="top"
                scrollEnabled
                inputAccessoryViewID={TOOLBAR_ID}
              />
            ) : (
              <ScrollView
                style={styles.previewScroll}
                contentContainerStyle={styles.previewScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Markdown style={markdownPreviewStyles}>{body}</Markdown>
              </ScrollView>
            )}
          </View>

          {!isPreview && (
            <View
              style={[
                styles.metadataBar,
                {
                  backgroundColor: elevatedSurface,
                  borderTopColor: borderColor,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.metadataLeft}
                onPress={() => setShowSubjectModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {selectedSubjectName ? (
                  <View
                    style={[
                      styles.subjectPill,
                      {
                        backgroundColor: colors.accent + '22',
                      },
                    ]}
                  >
                    <Text style={[styles.subjectPillText, { color: colors.accent }]}>
                      {selectedSubjectName}
                    </Text>
                  </View>
                ) : (
                  <Ionicons name="bookmark-outline" size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>

              <TouchableOpacity
                onPress={() => setShowTagsModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.metadataSpacer} />

              <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.doneBtn, { color: colors.accent }]}>Готово</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Subject picker */}
      <Modal
        visible={showSubjectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Предмет</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={subjectChipData}
              keyExtractor={(item) => (item.id ?? 'null').toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectModalChips}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.subjectModalChip,
                    {
                      backgroundColor:
                        selectedSubjectId === item.id ? colors.accent : colors.surfaceMuted,
                      borderColor:
                        selectedSubjectId === item.id ? colors.accent : borderColor,
                    },
                  ]}
                  onPress={() => {
                    setSelectedSubjectId(item.id);
                    setShowSubjectModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.subjectModalChipText,
                      {
                        color:
                          selectedSubjectId === item.id
                            ? colors.inverseText
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.sheetCloseBtn, { borderColor: borderColor }]}
              onPress={() => setShowSubjectModal(false)}
            >
              <Text style={styles.sheetCloseBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tags */}
      <Modal
        visible={showTagsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTagsModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Теги</Text>
              <TouchableOpacity onPress={() => setShowTagsModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagsChipsWrap}>
              {tagsList.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.surfaceMuted, borderColor: borderColor },
                  ]}
                  onPress={() => setTagsList((prev) => prev.filter((t) => t !== tag))}
                >
                  <Text style={[styles.tagChipText, { color: colors.textPrimary }]}>{tag}</Text>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} style={styles.tagChipX} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[
                styles.tagsModalInput,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: borderColor,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Новый тег (Enter или запятая)"
              placeholderTextColor={colors.textMuted}
              value={tagDraft}
              onChangeText={onTagDraftChange}
              onSubmitEditing={addTagFromDraft}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.sheetCloseBtn, { borderColor: borderColor }]}
              onPress={() => setShowTagsModal(false)}
            >
              <Text style={styles.sheetCloseBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ellipsis menu */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowMenuModal(false)}
          />
          <View style={[styles.modalSheet, styles.menuSheet]}>
            <TouchableOpacity style={styles.menuRow} onPress={exportFromMenu}>
              <Ionicons name="share-outline" size={22} color="#000" />
              <Text style={styles.menuRowText}>Поделиться / Экспорт</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={openAddCardFromMenu}>
              <Ionicons name="layers-outline" size={22} color="#000" />
              <Text style={styles.menuRowText}>Добавить карточку</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={saveFromMenu}>
              <Ionicons name="save-outline" size={22} color="#000" />
              <Text style={styles.menuRowText}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetCloseBtn, { borderColor: borderColor, marginTop: 8 }]}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.sheetCloseBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Flashcard creation modal */}
      <Modal
        visible={showCardModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCardModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новая карточка</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Ionicons name="close" size={24} color={colors.inverseText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Вопрос (лицевая сторона)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Введите вопрос..."
                placeholderTextColor={colors.textMuted}
                value={cardFront}
                onChangeText={setCardFront}
                multiline
                autoFocus
              />
              <Text style={styles.modalLabel}>Ответ (обратная сторона)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Введите ответ..."
                placeholderTextColor={colors.textMuted}
                value={cardBack}
                onChangeText={setCardBack}
                multiline
              />
              <TouchableOpacity
                style={[styles.modalSaveBtn, (!cardFront.trim() || !cardBack.trim()) && styles.modalSaveBtnDisabled]}
                onPress={handleAddCard}
                disabled={!cardFront.trim() || !cardBack.trim()}
              >
                <Text style={styles.modalSaveBtnText}>Добавить карточку</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Auto-cards modal */}
      <Modal
        visible={showAutoCardsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAutoCardsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.autoCardsSheet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Авто-карточки</Text>
                <Text style={styles.autoCardsSubtitle}>Найдено: {autoCards.length}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAutoCardsModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {autoCards.map((card, idx) => (
                <View key={idx} style={styles.autoCardItem}>
                  <View style={styles.autoCardHeader}>
                    <Text style={styles.autoCardLabel}>Карточка {idx + 1}</Text>
                    <TouchableOpacity
                      onPress={() => setAutoCards(prev => prev.filter((_, i) => i !== idx))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#E25A2C" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.autoCardFieldLabel}>Вопрос</Text>
                  <TextInput
                    style={styles.autoCardInput}
                    value={card.front}
                    onChangeText={text =>
                      setAutoCards(prev => prev.map((c, i) => i === idx ? { ...c, front: text } : c))
                    }
                    multiline
                  />
                  <Text style={styles.autoCardFieldLabel}>Ответ</Text>
                  <TextInput
                    style={styles.autoCardInput}
                    value={card.back}
                    onChangeText={text =>
                      setAutoCards(prev => prev.map((c, i) => i === idx ? { ...c, back: text } : c))
                    }
                    multiline
                  />
                </View>
              ))}

              {autoCards.length === 0 ? (
                <Text style={styles.autoCardsEmpty}>Все карточки удалены</Text>
              ) : (
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveAutoCards}
                >
                  <Text style={styles.modalSaveBtnText}>Сохранить {autoCards.length} карточек</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    {Platform.OS === 'ios' && (
      <InputAccessoryView nativeID={TOOLBAR_ID}>
        <View
          style={[
            styles.accessoryToolbar,
            {
              backgroundColor: colors.surface,
              borderTopColor: borderColor,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.mdToolbarContent}
            style={styles.mdToolbar}
          >
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('**', '**', true)}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('*', '*', true)}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('\n## ')}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>#</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('`', '`')}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>`</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('**', '** - ')}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>—</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                { backgroundColor: elevatedSurface },
              ]}
              onPress={() => insertAtCursor('\n- [ ] ')}
            >
              <Text style={[styles.toolbarBtnText, { color: colors.textPrimary }]}>[ ]</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </InputAccessoryView>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerRightIcons: {
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerIconWrap: {
    padding: 6,
  },
  headerSubjectHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  bodyArea: {
    flex: 1,
  },
  accessoryToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  mdToolbar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  mdToolbarContent: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  bodyInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    fontSize: 16,
    lineHeight: 26,
  },
  metadataBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metadataLeft: {
    justifyContent: 'center',
  },
  subjectPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 140,
  },
  subjectPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaDot: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  metadataSpacer: {
    flex: 1,
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  subjectModalChips: {
    paddingVertical: 8,
    paddingRight: 8,
  },
  subjectModalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  subjectModalChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  menuBackdrop: {
    flex: 1,
  },
  menuSheet: {
    maxHeight: '45%',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagChipX: {
    marginLeft: 4,
  },
  tagsModalInput: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  sheetCloseBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuRowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000', fontFamily: Typography.fonts.body },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
  },
  modalSaveBtn: {
    backgroundColor: '#C89153',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveBtnDisabled: { backgroundColor: '#e0e0e0' },
  modalSaveBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },

  // Auto-cards
  autoCardsSheet: { maxHeight: '90%' },
  autoCardsSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  autoCardItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  autoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  autoCardLabel: { fontSize: 13, fontWeight: '700', color: '#666' },
  autoCardFieldLabel: { fontSize: 12, color: '#999', marginBottom: 4, marginTop: 8 },
  autoCardInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  autoCardsEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
