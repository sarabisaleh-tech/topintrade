import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import MT5Setup from './components/MT5Setup';
import JournalApp from './JournalApp';

/**
 * This component combines MT5 Setup with JournalApp
 * When user clicks "Journal" in landing page:
 * 1. First shows MT5 setup if not completed
 * 2. Then shows JournalApp dashboard with MT5 Live data
 */
export default function JournalMT5App({ onBack }) {
  const { currentUser } = useAuth();
  const [showSetup, setShowSetup] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Check if user has completed MT5 setup before
    const checkSetupStatus = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check if account_info exists and has been synced
          if (userData.account_info && userData.sync_status) {
            // User has completed setup, go to dashboard
            setShowSetup(false);
          } else {
            // Show setup
            setShowSetup(true);
          }
        } else {
          // New user, show setup
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return <MT5Setup onComplete={() => setShowSetup(false)} onBack={onBack} />;
  }

  // Pass onBack and a flag to indicate this is MT5 Journal mode
  return <JournalApp onBack={onBack} mt5Mode={true} />;
}
