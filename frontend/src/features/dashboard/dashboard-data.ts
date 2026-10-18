import type { AppIconName } from '@/components/ui/app-icon';

export type DashboardMetric = {
  label: string;
  value: string;
  change: string;
  note: string;
  icon: AppIconName;
  tone: 'amber' | 'white' | 'blue';
};

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Total students', value: '1,738', change: '+8.4%', note: 'this academic year', icon: 'student', tone: 'amber' },
  { label: 'Teachers', value: '179', change: '+3.2%', note: '12 departments', icon: 'teacher', tone: 'white' },
  { label: 'Staff members', value: '65', change: '+2.1%', note: 'active employees', icon: 'staff', tone: 'white' },
  { label: 'Attendance', value: '94.2%', change: '+1.8%', note: 'compared to last week', icon: 'check', tone: 'blue' },
];

export const upcomingEvents = [
  { day: '18', month: 'Oct', title: 'Parent–teacher conference', time: '10:00 AM – 12:30 PM', audience: 'All grades', tone: 'blue' },
  { day: '21', month: 'Oct', title: 'Science fair exhibition', time: '09:00 AM – 02:00 PM', audience: 'Grades 6–10', tone: 'amber' },
  { day: '24', month: 'Oct', title: 'Monthly staff meeting', time: '03:30 PM – 04:30 PM', audience: 'Faculty & staff', tone: 'purple' },
];

export const recentActivity = [
  { initials: 'AR', title: 'Ariana Rahman was enrolled', detail: 'Grade 7 · Student ID ST-2048', time: '12 min ago', tone: 'blue' },
  { initials: 'MK', title: 'Attendance report published', detail: 'Grade 10 · Section A', time: '38 min ago', tone: 'amber' },
  { initials: 'NS', title: 'New notice shared with parents', detail: 'Annual sports day schedule', time: '1 hr ago', tone: 'purple' },
];
