import Papa from 'papaparse';

export function downloadCSVText(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDateOrdinal(dateStr: string): string {
  const dt = new Date(dateStr);
  const day = dt.getDate();
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthStr = months[dt.getMonth()];
  return `${day.toString().padStart(2, '0')}${suffix} ${monthStr}, ${dt.getFullYear()}`;
}

function formatTimeSlot(startStr: string, endStr?: string | null, lectureTime?: string | null): string {
  if (lectureTime && lectureTime.trim().length > 0) {
    return lectureTime;
  }
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600000);

  const format12h = (dt: Date) => {
    let hours = dt.getHours();
    const minutes = dt.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return `${format12h(start)} - ${format12h(end)}`;
}

export function generateGridCsv({
  subjectName,
  className,
  students,
  sessions,
  attendance,
}: {
  subjectName: string;
  className: string;
  students: Array<{ id: string; name: string; roll_no?: string | null }>;
  sessions: Array<{ id: string; start_time: string; end_time?: string | null; lecture_time?: string | null }>;
  attendance: Array<{ student_id: string; session_id: string; status: string }>;
}): string {
  const buffer: string[] = [];

  // Group attendance by student_id -> session_id -> status
  const attMap: Record<string, Record<string, string>> = {};
  for (const a of attendance) {
    if (!attMap[a.student_id]) attMap[a.student_id] = {};
    attMap[a.student_id][a.session_id] = a.status;
  }

  // Line 1: Roll No,Name,<Session Dates...>,Attendance
  const header1 = ['Roll No', 'Name'];
  for (const s of sessions) {
    header1.push(formatDateOrdinal(s.start_time));
  }
  header1.push('Attendance');
  buffer.push(header1.map((f) => `"${f.replace(/"/g, '""')}"`).join(','));

  // Line 2: ,,<Session Times...>
  const header2 = ['', ''];
  for (const s of sessions) {
    header2.push(formatTimeSlot(s.start_time, s.end_time, s.lecture_time));
  }
  header2.push('');
  buffer.push(header2.map((f) => `"${f.replace(/"/g, '""')}"`).join(','));

  // Student rows
  for (const st of students) {
    const row: string[] = [(st.roll_no || '').toString(), st.name];
    let attendedCount = 0;

    for (const s of sessions) {
      const status = attMap[st.id]?.[s.id];
      if (status === 'present') {
        row.push('P');
        attendedCount++;
      } else {
        row.push('');
      }
    }

    const totalSessions = sessions.length;
    const pct = totalSessions > 0 ? ((attendedCount / totalSessions) * 100).toFixed(2) : '0.00';
    row.push(`${attendedCount} / ${totalSessions} (${pct}%)`);

    buffer.push(row.map((f) => `"${f.replace(/"/g, '""')}"`).join(','));
  }

  return buffer.join('\n');
}

export function formatRosterForCSV(
  sessionName: string,
  roster: Array<{
    rollNo: string;
    name: string;
    email: string;
    status: string;
    timestamp: string;
  }>
) {
  const rows = roster.map((item, index) => ({
    'S.No': index + 1,
    'Roll Number': item.rollNo || 'N/A',
    'Student Name': item.name,
    'Email Address': item.email,
    'Attendance Status': item.status.toUpperCase(),
    'Check-in Time': item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A',
  }));
  return Papa.unparse(rows);
}
