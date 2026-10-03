type RecordData = Record<string, unknown>;
type Viewer = { accountRole: string; studentId?: string };
const objects = (value: unknown): RecordData[] =>
  Array.isArray(value) ? value.filter((item): item is RecordData => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
const pick = (record: RecordData, fields: string[]): RecordData =>
  Object.fromEntries(fields.filter(field => record[field] !== undefined).map(field => [field, record[field]]));

const ACCOUNT_FIELDS = ['id', 'name', 'email', 'role', 'status', 'studentId', 'departmentOrOffice', 'phoneNumber', 'lastLogin', 'createdAt', 'profilePicture'];
const STAFF_FIELDS = ['id', 'name', 'role', 'status', 'departmentOrOffice', 'profilePicture'];
const STUDENT_FIELDS = ['id', 'studentId', 'name', 'email', 'phone', 'degreeProgram', 'yearLevel', 'enrollmentStatus', 'academicStanding', 'unitsEnrolled', 'isArchived', 'requestCount', 'joinedDate', 'profilePicture'];
const INTAKE_FIELDS = ['id', 'studentId', 'name', 'email', 'phone', 'degreeProgram', 'yearLevel'];

export function projectAccounts(viewer: Viewer, values: unknown): RecordData[] {
  if (viewer.accountRole === 'student') return [];
  return objects(values)
    .filter(record => viewer.accountRole === 'superadmin' || record.role !== 'student')
    .map(record => pick(record, viewer.accountRole === 'superadmin' ? ACCOUNT_FIELDS : STAFF_FIELDS));
}

export function projectStudents(viewer: Viewer, values: unknown, accounts: unknown, tickets: unknown): RecordData[] {
  if (viewer.accountRole === 'student') return [];
  if (viewer.accountRole === 'superadmin') return objects(values).map(record => pick(record, STUDENT_FIELDS));
  // Assemble the intake fallback in the response only. Never repair stored profiles here.
  const profiles = new Map(objects(values).map(record => [String(record.studentId), { ...record }]));
  for (const account of objects(accounts).filter(record => record.role === 'student' && record.studentId)) {
    const id = String(account.studentId);
    const profile = profiles.get(id);
    if (!profile) profiles.set(id, {
      id: account.id, studentId: id, name: account.name, email: account.email,
      phone: account.phoneNumber || '', degreeProgram: account.degreeProgram || account.departmentOrOffice || '',
      yearLevel: account.yearLevel || '', profilePicture: account.profilePicture,
    });
    else if (!profile.profilePicture && account.profilePicture) profile.profilePicture = account.profilePicture;
  }
  const linked = new Set(objects(tickets).map(ticket => String(ticket.studentId)));
  return [...profiles.values()]
    .filter(record => viewer.accountRole === 'receiver' || linked.has(String(record.studentId)))
    .map(record => {
      const result = pick(record, viewer.accountRole === 'receiver' ? INTAKE_FIELDS : ['studentId', 'name']);
      if (linked.has(String(record.studentId)) && record.profilePicture) result.profilePicture = record.profilePicture;
      return result;
    });
}