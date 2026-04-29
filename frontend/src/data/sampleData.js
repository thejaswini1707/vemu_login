export const BRANCHES = ['CSE', 'ECE', 'EEE', 'Civil', 'Mechanical', 'CSM', 'IT', 'Mech'];
export const YEARS = ['1', '2', '3', '4'];
export const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export const ROLE_CONFIG = {
  admin: {
    name: 'Administrator',
    icon: '👑',
    badge: 'Full Control',
    image: '/admin.jpeg'
  },
  hod: {
    name: 'Head of Dept',
    icon: '🎓',
    badge: 'Department Lead',
    image: '/hod.jpeg'
  },
  faculty: {
    name: 'Faculty',
    icon: '📚',
    badge: 'Educator',
    image: '/faculty.jpeg'
  },
  student: {
    name: 'Student',
    icon: '📖',
    badge: 'Learner',
    image: '/student.jpeg'
  }
};

export const DEMO_HINTS = {
  admin: 'admin / Admin@123',
  hod: 'hod / hod@123',
  faculty: 'faculty / Faculty@123',
  student: 'student / student@123'
};

export function formatYear(year) {
  if (!year) return '';

  const value = String(year);

  if (value === '1') return '1st Year';
  if (value === '2') return '2nd Year';
  if (value === '3') return '3rd Year';
  if (value === '4') return '4th Year';

  return value;
}

export function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'hod') return 'HOD';
  if (role === 'faculty') return 'Faculty';
  if (role === 'student') return 'Student';
  return role || 'User';
}