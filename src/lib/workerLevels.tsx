
import React from 'react';
import type { DeliveryWorker } from './types';

interface Level {
  name: string;
  threshold: number;
  icon: React.ComponentType<{ className?: string }>;
  nextLevelThreshold?: number;
}

export const BronzeIcon = ({className}: {className?: string}) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="bronze-gradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#f0c8a8" />
                <stop offset="50%" stopColor="#cd7f32" />
                <stop offset="100%" stopColor="#8c5822" />
            </radialGradient>
        </defs>
        <path d="M50 5 L61.8 38.2 L98.1 38.2 L68.1 59.8 L79.9 93 L50 71.4 L20.1 93 L31.9 59.8 L1.9 38.2 L38.2 38.2 Z" fill="url(#bronze-gradient)" stroke="#8c5822" strokeWidth="2"/>
    </svg>
);

export const SilverIcon = ({className}: {className?: string}) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="silver-gradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#f0f0f0" />
                <stop offset="50%" stopColor="#c0c0c0" />
                <stop offset="100%" stopColor="#a0a0a0" />
            </radialGradient>
        </defs>
        <path d="M50 2 L56 22 L78 22 L61 36 L67 56 L50 44 L33 56 L39 36 L22 22 L44 22 Z M50 52 L56 72 L78 72 L61 86 L67 106 L50 94 L33 106 L39 86 L22 72 L44 72 Z" transform="translate(0, -10)" fill="url(#silver-gradient)" stroke="#808080" strokeWidth="1"/>
    </svg>
);

export const GoldIcon = ({className}: {className?: string}) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="gold-gradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#fff2a8" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#c8a400" />
            </radialGradient>
        </defs>
        <path d="M50,5 L58.54,29.39 L85.08,29.39 L63.27,44.21 L71.81,68.61 L50,53.79 L28.19,68.61 L36.73,44.21 L14.92,29.39 L41.46,29.39 Z M50,60 L54.27,72.61 L65.08,72.61 L55.4,80 L59.6,92.6 L50,85 L40.4,92.6 L44.6,80 L34.9,72.6 L45.7,72.6 Z" fill="url(#gold-gradient)" stroke="#b8860b" strokeWidth="1.5"/>
    </svg>
);

export const DiamondIcon = ({className}: {className?: string}) => (
     <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="diamond-gradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#e0f8ff" />
                <stop offset="50%" stopColor="#b9f2ff" />
                <stop offset="100%" stopColor="#89e8ff" />
            </radialGradient>
        </defs>
        <path d="M50 2 L98 40 L50 98 L2 40 Z" fill="url(#diamond-gradient)" stroke="#00bfff" strokeWidth="1"/>
        <path d="M50 2 L2 40 L50 45 Z M98 40 L50 45 L50 2 Z M50 98 L2 40 L50 45 Z M98 40 L50 98 L50 45 Z" fill-opacity="0.2" fill="white"/>
    </svg>
);


const levels: Omit<Level, 'nextLevelThreshold'>[] = [
    { name: "برونزي", threshold: 25, icon: BronzeIcon },
    { name: "فضي", threshold: 55, icon: SilverIcon },
    { name: "ذهبي", threshold: 100, icon: GoldIcon },
    { name: "ماسي", threshold: 200, icon: DiamondIcon },
];

export const getWorkerLevel = (worker: DeliveryWorker, deliveredOrdersCount: number, now: Date): { level: Level | null, isFrozen: boolean } => {
    const sortedLevels = [...levels].sort((a, b) => b.threshold - a.threshold);
    let currentLevel: Omit<Level, 'nextLevelThreshold'> | null = null;
    
    for (const level of sortedLevels) {
        if (deliveredOrdersCount >= level.threshold) {
            currentLevel = level;
            break;
        }
    }

    if (!currentLevel) {
        return { level: null, isFrozen: false };
    }
    
    // Freeze logic
    const lastDeliveredDate = worker.lastDeliveredAt ? new Date(worker.lastDeliveredAt) : null;
    let isFrozen = false;
    if (lastDeliveredDate) {
        const hoursSinceLastDelivery = (now.getTime() - lastDeliveredDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastDelivery > 48) {
            isFrozen = true;
        }
    }

    // Find next level
    const currentLevelIndex = levels.findIndex(l => l.name === currentLevel!.name);
    const nextLevel = currentLevelIndex !== -1 && currentLevelIndex < levels.length -1 ? levels[currentLevelIndex + 1] : null;

    return {
        level: {
            ...currentLevel,
            nextLevelThreshold: nextLevel?.threshold
        },
        isFrozen
    };
};
