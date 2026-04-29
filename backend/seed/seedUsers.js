require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Announcement = require('../models/Announcement');

const seedUsers = [
  {
    role: 'admin',
    username: 'admin',
    displayName: 'System Admin',
    password: 'Admin@123',
    email: 'admin@vemu.edu',
    branch: 'Administration'
  },
  {
    role: 'hod',
    username: 'hod',
    displayName: 'CSE HOD',
    password: 'hod@123',
    email: 'hod@vemu.edu',
    branch: 'CSE'
  },
  {
    role: 'faculty',
    username: 'faculty',
    displayName: 'Faculty Demo',
    password: 'Faculty@123',
    email: 'faculty@vemu.edu',
    branch: 'CSE'
  },
  {
    role: 'student',
    username: 'student',
    displayName: 'Student Demo',
    password: 'student@123',
    email: 'student@vemu.edu',
    branch: 'CSE',
    year: '2',
    section: 'A',
    rollNumber: '2301CS101'
  },
  {
    role: 'student',
    username: 'anusha',
    displayName: 'C.H. Anusha',
    password: 'pass9',
    email: 'anu@gmail.com',
    branch: 'Civil',
    year: '4',
    section: 'A',
    rollNumber: '244M1A0550'
  },
  {
    role: 'student',
    username: 'charishma',
    displayName: 'S. Charishma',
    password: 'pass10',
    email: 'cherishma@gmail.com',
    branch: 'CSM',
    year: '1',
    section: 'A',
    rollNumber: '244M1A0559'
  }
];

async function seed() {
  try {
    await connectDB();

    for (const item of seedUsers) {
      const passwordHash = await bcrypt.hash(item.password, 10);

      await User.findOneAndUpdate(
        { role: item.role, username: item.username },
        {
          role: item.role,
          username: item.username,
          displayName: item.displayName || item.username,
          passwordHash,
          status: 'Active',
          email: item.email || '',
          branch: item.branch || '',
          year: item.year || '',
          section: item.section || '',
          rollNumber: item.rollNumber || ''
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`✅ Seeded ${item.role}: ${item.username}`);
    }

    const existingAnnouncement = await Announcement.findOne({ title: 'Welcome to Student Attendance Portal' });

    if (!existingAnnouncement) {
      await Announcement.create({
        title: 'Welcome to Student Attendance Portal',
        description: 'All announcements and attendance updates will appear here.',
        type: 'General',
        targetRoles: ['student', 'faculty', 'hod'],
        branch: '',
        createdByName: 'system',
        createdByRole: 'admin'
      });
      console.log('✅ Seeded welcome announcement');
    }

    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();