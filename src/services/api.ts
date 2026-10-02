import axios from 'axios';

const FIREBASE_DB_URL = 'https://rfid-attendence-ba2f8-default-rtdb.firebaseio.com';

export const ATTENDANCE_POLL_INTERVAL_MS = 10000;

export type StudentProfile = {
  uid: string;
  name: string;
  rollNo: string;
  className: string;
};

export type AttendanceRecord = {
  id: string;
  uid: string;
  scannerId?: string;
  timestamp: string;
  student: string;
  rollNo: string;
  status: string;
};

type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
};

function toIsoTimestamp(value: unknown): string {
  if (typeof value !== 'number' && typeof value !== 'string') return '';

  const numericValue = typeof value === 'number' ? value : Number(value);
  const milliseconds = Number.isFinite(numericValue)
    ? numericValue < 1_000_000_000_000
      ? numericValue * 1000
      : numericValue
    : typeof value === 'string'
      ? Date.parse(value)
      : Number.NaN;

  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : '';
}

export async function fetchStudents(): Promise<StudentProfile[]> {
  try {
    const response = await axios.get<unknown>(`${FIREBASE_DB_URL}/students.json`);
    const data = response.data;
    if (!data || data === 'null' || typeof data !== 'object' || Array.isArray(data)) return [];

    return Object.entries(data as Record<string, unknown>).flatMap(([uid, value]) => {
      if (!value || typeof value !== 'object') return [];
      const profile = value as Record<string, unknown>;
      if (typeof profile.name !== 'string' || !profile.name.trim()) return [];

      return [{
        uid,
        name: profile.name.trim(),
        rollNo: typeof profile.rollNo === 'string' ? profile.rollNo : '',
        className: typeof profile.class === 'string' ? profile.class : 'Unassigned',
      }];
    });
  } catch (error) {
    console.error('Student fetch error:', error);
    return [];
  }
}

export async function saveStudent(profile: StudentProfile): Promise<void> {
  const uid = profile.uid.trim().toUpperCase();
  if (!uid || /[.#$\[\]/\u0000-\u001F\u007F]/.test(uid)) {
    throw new Error('The RFID UID contains a character that Firebase cannot use in a key.');
  }

  await axios.put(`${FIREBASE_DB_URL}/students/${encodeURIComponent(uid)}.json`, {
    name: profile.name.trim(),
    rollNo: profile.rollNo.trim(),
    class: profile.className.trim() || 'Unassigned',
  });
}

export async function deleteStudent(uid: string): Promise<void> {
  await axios.delete(`${FIREBASE_DB_URL}/students/${encodeURIComponent(uid)}.json`);
}

export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  try {
    const [students, response] = await Promise.all([
      fetchStudents(),
      axios.get<unknown>(`${FIREBASE_DB_URL}/attendanceLogs.json`),
    ]);
    const logs = response.data;
    if (!logs || typeof logs !== 'object' || Array.isArray(logs)) return [];

    const studentsByUid = new Map(students.map((student) => [student.uid.toUpperCase(), student]));

    return Object.entries(logs as Record<string, unknown>).flatMap(([id, value]) => {
      if (!value || typeof value !== 'object') return [];
      const log = value as Record<string, unknown>;
      const uidValue = log.studentUid ?? log.uid;
      if (typeof uidValue !== 'string' || typeof log.status !== 'string') return [];

      const uid = uidValue.trim().toUpperCase();
      const student = studentsByUid.get(uid);

      return [{
        id,
        uid,
        scannerId: typeof log.scannerId === 'string' ? log.scannerId : undefined,
        timestamp: toIsoTimestamp(log.timestamp),
        student: student?.name ?? 'Unknown Student',
        rollNo: student?.rollNo ?? '',
        status: log.status,
      }];
    }).sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return [];
  }
}

export async function fetchTodayAttendance(): Promise<AttendanceRecord[]> {
  try {
    const all = await fetchAttendance();
    const today = new Date().toISOString().split('T')[0];
    return all.filter((row) => row.timestamp.startsWith(today));
  } catch (error) {
    console.error('Today fetch error:', error);
    return [];
  }
}

export async function fetchStats(): Promise<AttendanceStats> {
  try {
    const [students, today] = await Promise.all([fetchStudents(), fetchTodayAttendance()]);
    const registeredUids = new Set(students.map((student) => student.uid.trim().toUpperCase()));
    const latestByStudent = new Map<string, { timestamp: number; status: string }>();

    today.forEach((row) => {
      const studentUid = row.uid.trim().toUpperCase();
      const timestamp = Date.parse(row.timestamp);
      if (!registeredUids.has(studentUid) || !Number.isFinite(timestamp)) return;

      const previous = latestByStudent.get(studentUid);
      if (!previous || timestamp >= previous.timestamp) {
        latestByStudent.set(studentUid, { timestamp, status: row.status });
      }
    });

    const statuses = Array.from(latestByStudent.values(), (entry) => entry.status);
    const present = statuses.filter((status) => status === 'IN').length;
    const total = registeredUids.size;
    const absent = Math.max(0, total - present);

    return { total, present, absent };
  } catch (error) {
    console.error('Stats error:', error);
    return { total: 0, present: 0, absent: 0 };
  }
}