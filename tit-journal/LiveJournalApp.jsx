import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import MT5LiveSetup from './MT5LiveSetup';
import LiveTradingDashboard from './LiveTradingDashboard';

export default function LiveJournalApp() {
  const { currentUser } = useAuth();
  const [showSetup, setShowSetup] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // بررسی اینکه آیا کاربر قبلاً Setup را تکمیل کرده یا نه
    const checkSetupStatus = async () => {
      try {
        const userRef = doc(db, 'liveTrading', currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().status === 'active') {
          // اگر کاربر قبلاً Setup کرده، مستقیم به Dashboard برو
          setShowSetup(false);
        } else {
          // اگر نه، Setup را نشان بده
          setShowSetup(true);
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        setShowSetup(true);
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#FFFFFF'
      }}>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  if (showSetup) {
    return <MT5LiveSetup onComplete={() => setShowSetup(false)} />;
  }

  return <LiveTradingDashboard />;
}
