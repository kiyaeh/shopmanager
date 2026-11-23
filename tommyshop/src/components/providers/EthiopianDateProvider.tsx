'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type DateFormat = 'ethiopian' | 'gregorian';

const DateFormatContext = createContext<{
  format: DateFormat;
  toggle: () => void;
}>({ format: 'ethiopian', toggle: () => {} });

export function EthiopianDateProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormat] = useState<DateFormat>('ethiopian');

  useEffect(() => {
    const saved = localStorage.getItem('dateFormat') as DateFormat | null;
    if (saved === 'ethiopian' || saved === 'gregorian') setFormat(saved);
  }, []);

  const toggle = () => {
    setFormat(prev => {
      const next = prev === 'ethiopian' ? 'gregorian' : 'ethiopian';
      localStorage.setItem('dateFormat', next);
      return next;
    });
  };

  return (
    <DateFormatContext.Provider value={{ format, toggle }}>
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat() {
  return useContext(DateFormatContext);
}
