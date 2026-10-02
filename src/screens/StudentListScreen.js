import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/app-text';
import { AppTextInput as TextInput } from '../components/app-text-input';
import {
  Search,
  UserPlus,
  Trash2,
  CreditCard,
  User,
  X,
  CheckCircle2,
  BookOpen,
} from 'lucide-react-native';
import {
  ATTENDANCE_POLL_INTERVAL_MS,
  deleteStudent,
  fetchStudents,
  saveStudent,
} from '../services/api';
import { useAppTheme } from '../theme/colors';

export default function StudentListScreen() {
  const { theme, isDark } = useAppTheme();
  const [students, setStudents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Form State for Adding New Student
  const [newName, setNewName] = useState('');
  const [newRollNo, setNewRollNo] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newClass, setNewClass] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;
    let timeout;

    const updateStudents = async () => {
      try {
        const data = await fetchStudents();
        if (isActive) setStudents(data);
      } finally {
        if (isActive) {
          timeout = setTimeout(updateStudents, ATTENDANCE_POLL_INTERVAL_MS);
        }
      }
    };

    updateStudents();

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, []));

  const refreshStudents = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchStudents();
      setStudents(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Filter students by name, UID, or roll number
  const filteredStudents = students.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler: Add New Student
  const handleAddStudent = async () => {
    if (!newName.trim() || !newRollNo.trim() || !newUid.trim()) {
      Alert.alert('Missing Fields', 'Please enter Name, Roll Number, and RFID UID.');
      return;
    }

    // Check for duplicate UID
    const existingUid = students.find(
      (s) => s.uid.toLowerCase().trim() === newUid.toLowerCase().trim()
    );
    if (existingUid) {
      Alert.alert('Duplicate UID', `This UID is already registered to ${existingUid.name}.`);
      return;
    }

    const newStudent = {
      uid: newUid.trim().toUpperCase(),
      name: newName.trim(),
      rollNo: newRollNo.trim(),
      className: newClass.trim() || 'Unassigned',
    };

    try {
      await saveStudent(newStudent);
      setStudents((currentStudents) => [
        newStudent,
        ...currentStudents.filter((student) => student.uid !== newStudent.uid),
      ]);
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Student details could not be saved to Firebase.'
      );
      return;
    }

    resetForm();
    setModalVisible(false);
    Alert.alert('Student Saved', `${newStudent.name} was saved to Firebase.`);
  };

  // Handler: Delete Student with Confirmation
  const handleDeleteStudent = (uid, name) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to remove ${name} from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudent(uid);
              setStudents((currentStudents) =>
                currentStudents.filter((student) => student.uid !== uid)
              );
            } catch {
              Alert.alert('Delete Failed', 'Student details could not be deleted from Firebase.');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setNewName('');
    setNewRollNo('');
    setNewUid('');
    setNewClass('');
  };

  const renderStudentCard = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.cardMain}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}>
          <User size={22} color={theme.primary} />
        </View>

        {/* Student Info */}
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: theme.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.studentSub, { color: theme.textSecondary }]}>
            Roll No: {item.rollNo} • {item.className}
          </Text>

          {/* UID Badge */}
          <View style={[styles.uidBadge, { backgroundColor: theme.background }]}>
            <CreditCard size={12} color={theme.iconMuted} />
            <Text style={[styles.uidText, { color: theme.textSecondary }]}>UID: {item.uid}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.badgeOutBg }]}
          onPress={() => handleDeleteStudent(item.uid, item.name)}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Students</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {students.length} Registered Student{students.length === 1 ? '' : 's'}
          </Text>
        </View>

        {/* Add Student Action Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isDark ? theme.badgeInText : theme.success }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <UserPlus size={18} color={isDark ? theme.badgeInBg : '#FFFFFF'} />
          <Text style={[styles.addButtonText, { color: isDark ? theme.badgeInBg : '#FFFFFF' }]}>Add Student</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Search size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search name, roll no, or UID..."
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Student List */}
      <FlatList
        style={{ backgroundColor: theme.background }}
        data={filteredStudents}
        keyExtractor={(item) => item.uid}
        renderItem={renderStudentCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshStudents} colors={[theme.primary]} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No students registered yet</Text>
          </View>
        }
      />

      {/* Add Student Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Register New Student</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={theme.iconMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* Student Name Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name *</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <User size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.primary}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>
              </View>

              {/* Roll Number Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Roll Number *</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <BookOpen size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="e.g. CS106"
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.primary}
                    value={newRollNo}
                    onChangeText={setNewRollNo}
                  />
                </View>
              </View>

              {/* RFID UID Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>RFID Card UID *</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <CreditCard size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="e.g. A3 B8 12 F0"
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.primary}
                    value={newUid}
                    onChangeText={setNewUid}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Class / Section Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Class / Section</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <BookOpen size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="e.g. Grade 10-A"
                    placeholderTextColor={theme.textMuted}
                    selectionColor={theme.primary}
                    value={newClass}
                    onChangeText={setNewClass}
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: isDark ? theme.badgeInText : theme.success }]}
                onPress={handleAddStudent}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={18} color={isDark ? theme.badgeInBg : '#FFFFFF'} />
                <Text style={[styles.saveButtonText, { color: isDark ? theme.badgeInBg : '#FFFFFF' }]}>Save Student Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  studentSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  uidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  uidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalForm: {
    gap: 16,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});