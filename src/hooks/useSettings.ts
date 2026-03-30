import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'BDT',
  partnerAName: 'Sabbir',
  partnerBName: 'Sohel',
  partnerCName: 'Nasir',
  categories: ['বিক্রয়', 'ক্রয়', 'অর্ডার (লাভ-ক্ষতি)', 'সেবা', 'ভাড়া', 'বেতন', 'ইউটিলিটি', 'মার্কেটিং', 'অন্যান্য'],
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        // Migration: If the names are still the old defaults, update them
        if (data.partnerAName === 'পার্টনার A' && data.partnerBName === 'পার্টনার B' && data.partnerCName === 'পার্টনার C') {
          const updated = {
            ...data,
            partnerAName: 'Sabbir',
            partnerBName: 'Sohel',
            partnerCName: 'Nasir',
          };
          setDoc(doc(db, 'settings', 'global'), updated);
          setSettings(updated);
        } else {
          setSettings(data);
        }
      } else {
        setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    await setDoc(doc(db, 'settings', 'global'), { ...settings, ...newSettings }, { merge: true });
  };

  return { settings, loading, updateSettings };
}
