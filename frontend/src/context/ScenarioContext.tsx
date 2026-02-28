'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { FullScenarioContext } from '../types/api.contracts';

interface ScenarioContextType {
    scenario: FullScenarioContext | null;
    setScenario: (scenario: FullScenarioContext | null) => void;
    history: any[];
    setHistory: (history: any[]) => void;
    audioFileKeys: string[];
    setAudioFileKeys: (keys: string[]) => void;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export function ScenarioProvider({ children }: { children: ReactNode }) {
    const [scenario, setScenario] = useState<FullScenarioContext | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [audioFileKeys, setAudioFileKeys] = useState<string[]>([]);

    return (
        <ScenarioContext.Provider value={{ scenario, setScenario, history, setHistory, audioFileKeys, setAudioFileKeys }}>
            {children}
        </ScenarioContext.Provider>
    );
}

export function useScenario() {
    const context = useContext(ScenarioContext);
    if (context === undefined) {
        throw new Error('useScenario must be used within a ScenarioProvider');
    }
    return context;
}
