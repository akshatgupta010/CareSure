import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoModeContextType {
  judgeMode: boolean;
  toggleJudgeMode: () => void;
  setJudgeMode: (enabled: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

export const DemoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [judgeMode, setJudgeModeState] = useState<boolean>(() => {
    return localStorage.getItem('caresure_judge_mode') !== 'false'; // default true for showcase
  });

  useEffect(() => {
    localStorage.setItem('caresure_judge_mode', String(judgeMode));
  }, [judgeMode]);

  const toggleJudgeMode = () => setJudgeModeState((prev) => !prev);
  const setJudgeMode = (enabled: boolean) => setJudgeModeState(enabled);

  return (
    <DemoModeContext.Provider value={{ judgeMode, toggleJudgeMode, setJudgeMode }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) throw new Error('useDemoMode must be used within DemoModeProvider');
  return context;
};
