'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StaffSidebar from '@/components/admin/StaffSidebar';

interface StaffInfo {
  isStaff: boolean;
  role: 'admin' | 'support' | null;
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const token = localStorage.getItem('mushin_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const appMeta = payload.app_metadata ?? {};
          setStaffInfo({
            isStaff: appMeta.realm === 'staff',
            role: appMeta.staff_role ?? null,
          });
        } catch {
          setStaffInfo({ isStaff: false, role: null });
        }
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!staffInfo?.isStaff) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Access denied. Staff authentication required.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <StaffSidebar role={staffInfo.role} />
      <main style={{ flex: 1, padding: '32px', background: '#f8fafc' }}>
        {children}
      </main>
    </div>
  );
}
