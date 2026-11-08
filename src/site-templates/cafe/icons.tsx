import type { ReactElement, SVGProps } from "react";

/** Набор иконок кофейни: линия 2px, скруглённые концы, currentColor. Все декоративные (aria-hidden). */
type P = SVGProps<SVGSVGElement>;

const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

const make = (d: ReactElement) => {
  const Icon = (p: P) => (
    <svg {...base} {...p}>
      {d}
    </svg>
  );
  return Icon;
};

export const IconBag = make(
  <>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconClose = make(<path d="m6 6 12 12M18 6 6 18" />);
export const IconCheck = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconArrow = make(<path d="M5 12h14m-6-6 6 6-6 6" />);
export const IconWifi = make(
  <>
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" />
    <circle cx="12" cy="19.2" r="0.9" fill="currentColor" />
  </>,
);
export const IconPlug = make(
  <>
    <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8Z" />
    <path d="M12 17v4" />
  </>,
);
export const IconMoon = make(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />);
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const IconPin = make(
  <>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);
export const IconPhone = make(<path d="M5 4h4l2 5-2.5 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />);
export const IconSend = make(<path d="M21 4 3 11l7 2.5L12.5 21 21 4ZM10 13.5 21 4" />);
export const IconCup = make(
  <>
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
    <path d="M17 10h1.500a2.5 2.5 0 0 1 0 5H17" />
  </>,
);
export const IconStar = make(<path d="m12 3.5 2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.800 6.800 19.600l1-5.800L3.5 9.700l5.900-.8L12 3.5Z" fill="currentColor" stroke="none" />);

/** Миндаль: фирменный знак. Заливка — currentColor, прожилка — цвет фона через --almond-vein. */
export function Almond(p: P) {
  return (
    <svg viewBox="0 0 32 32" width={24} height={24} aria-hidden="true" focusable="false" {...p}>
      <path d="M16 3c6 5 9 11 9 16.500C25 25.500 21 29 16 29s-9-3.5-9-9.500C7 14 10 8 16 3Z" fill="currentColor" />
      <path d="M16 9c2.5 3 3.5 6.500 3.5 10M16 9c-2.5 3-3.5 6.500-3.5 10" stroke="var(--almond-vein, #fff)" strokeWidth="1.600" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}
