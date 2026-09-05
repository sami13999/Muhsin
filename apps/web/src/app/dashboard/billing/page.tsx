'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BillingHeader from '@/components/billing/BillingHeader';
import CreditUsageChart from '@/components/billing/CreditUsageChart';
import CurrentPlanCard from '@/components/billing/CurrentPlanCard';
import SpendCapsCard from '@/components/billing/SpendCapsCard';
import RecentInvoicesCard from '@/components/billing/RecentInvoicesCard';
import UpgradePlanModal from '@/components/billing/UpgradePlanModal';
import { useToast } from '@/lib/toast';

export default function BillingPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState('Growth');
  const [creditsTotal, setCreditsTotal] = useState(100000);
  const [creditsUsed] = useState(17183);
  const [monthlyCap, setMonthlyCap] = useState(5000);
  const [dailyCap, setDailyCap] = useState(250);
  const [workflowCap, setWorkflowCap] = useState(50);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  useEffect(() => {
    const savedPlan = localStorage.getItem('mushin_plan');
    const savedLimit = localStorage.getItem('mushin_credits_limit');
    if (savedPlan) setCurrentPlan(savedPlan);
    if (savedLimit) setCreditsTotal(Number(savedLimit));

    const savedCaps = localStorage.getItem('mushin_spend_caps');
    if (savedCaps) {
      try {
        const parsed = JSON.parse(savedCaps);
        setMonthlyCap(parsed.monthly);
        setDailyCap(parsed.daily);
        setWorkflowCap(parsed.workflow);
      } catch (e) {}
    }

    if (searchParams.get('topup') === 'true' || searchParams.get('upgrade') === 'true') {
      setIsUpgradeOpen(true);
    }
  }, [searchParams]);

  const handleUpgradePlan = (plan: string, limit: number) => {
    setCurrentPlan(plan);
    setCreditsTotal(limit);
    localStorage.setItem('mushin_plan', plan);
    localStorage.setItem('mushin_credits_limit', String(limit));
    setIsUpgradeOpen(false);
    toast.success('Subscription Updated', `Successfully upgraded to the ${plan} tier.`);
  };

  const handleSaveCaps = (values: { monthly: number; daily: number; workflow: number }) => {
    setMonthlyCap(values.monthly);
    setDailyCap(values.daily);
    setWorkflowCap(values.workflow);
    localStorage.setItem('mushin_spend_caps', JSON.stringify(values));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <BillingHeader />

      {/* Top Cards Row */}
      <div className="billing-top-grid" style={{ gap: '24px', alignItems: 'stretch' }}>
        <CreditUsageChart />
        <CurrentPlanCard 
          currentPlan={currentPlan} 
          creditsUsed={creditsUsed} 
          creditsTotal={creditsTotal} 
          onUpgradeClick={() => setIsUpgradeOpen(true)} 
        />
      </div>

      {/* Bottom Cards Row */}
      <div className="billing-bottom-grid" style={{ gap: '24px', alignItems: 'stretch' }}>
        <SpendCapsCard 
          monthly={monthlyCap} 
          daily={dailyCap} 
          workflow={workflowCap} 
          onSave={handleSaveCaps} 
        />
        <RecentInvoicesCard />
      </div>

      {/* Upgrade / Topup Modal overlay */}
      {isUpgradeOpen && (
        <UpgradePlanModal 
          currentPlan={currentPlan} 
          onClose={() => setIsUpgradeOpen(false)} 
          onSelectPlan={handleUpgradePlan} 
        />
      )}
    </div>
  );
}
