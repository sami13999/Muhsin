'use client';

import React from 'react';
import NotificationsSettings from './NotificationsSettings';
import AppearanceSettings from './AppearanceSettings';
import DangerZoneSettings from './DangerZoneSettings';

interface PreferencesSettingsProps {
  activeSubTab: 'notifications' | 'appearance' | 'danger';
}

export default function PreferencesSettings({ activeSubTab }: PreferencesSettingsProps) {
  return (
    <div>
      {activeSubTab === 'notifications' && <NotificationsSettings />}
      {activeSubTab === 'appearance' && <AppearanceSettings />}
      {activeSubTab === 'danger' && <DangerZoneSettings />}
    </div>
  );
}
