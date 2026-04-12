import type { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings | EasyMoneyConcept',
  description: 'Edit dashboard rules, thresholds, and scenario defaults.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
