import type { AppIconName } from '@/components/ui/app-icon';

export type PlatformMetric = {
  label: string;
  value: string;
  change: string;
  detail: string;
  icon: AppIconName;
  tone: 'amber' | 'white' | 'blue';
};

export const platformMetrics: PlatformMetric[] = [
  { label: 'Total schools', value: '128', change: '+12.5%', detail: '16 added this quarter', icon: 'building', tone: 'amber' },
  { label: 'Active schools', value: '119', change: '93%', detail: 'of all registered schools', icon: 'check', tone: 'white' },
  { label: 'Platform users', value: '24.8K', change: '+8.2%', detail: 'across every workspace', icon: 'people', tone: 'white' },
  { label: 'Feature adoption', value: '87%', change: '+4.6%', detail: 'student management enabled', icon: 'features', tone: 'blue' },
];

export const recentSchools = [
  { name: 'Northbridge Academy', slug: 'northbridge-academy', initials: 'NA', admin: 'Tasnim Ahmed', users: '1,248', status: 'Active', tone: 'blue' },
  { name: 'Scholars International', slug: 'scholars-intl', initials: 'SI', admin: 'Nafisa Karim', users: '986', status: 'Active', tone: 'amber' },
  { name: 'Crescent Model School', slug: 'crescent-model', initials: 'CM', admin: 'Rayhan Kabir', users: '742', status: 'Pending', tone: 'purple' },
  { name: 'Riverdale School & College', slug: 'riverdale-sc', initials: 'RS', admin: 'Mehedi Hasan', users: '1,536', status: 'Active', tone: 'green' },
];

export const platformActivity = [
  { title: 'New school workspace created', detail: 'Northbridge Academy', time: '12 min', icon: 'building' as const, tone: 'blue' },
  { title: 'Feature configuration updated', detail: 'Scholars International', time: '34 min', icon: 'features' as const, tone: 'amber' },
  { title: 'School access suspended', detail: 'Eastern Valley School', time: '2 hr', icon: 'notice' as const, tone: 'red' },
];

export const featureAdoption = [
  { label: 'Student management', value: 87, count: '111 schools', tone: 'blue' },
  { label: 'Attendance tracking', value: 72, count: '92 schools', tone: 'amber' },
  { label: 'Academic reporting', value: 54, count: '69 schools', tone: 'purple' },
];
