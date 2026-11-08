import type { ReactNode, SVGProps } from "react";

/** Линейные иконки шаблона «Ресторан»: 24×24, цвет — currentColor, без внешних библиотек. */
function Icon({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const IconArrow = () => (
  <Icon>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const IconClose = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const IconCheck = () => (
  <Icon strokeWidth="3">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const IconPlus = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const IconMinus = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);
export const IconPin = () => (
  <Icon>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
);
export const IconPhone = () => (
  <Icon>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </Icon>
);
export const IconSend = () => (
  <Icon>
    <path d="M21 4 3 11l6 2.5L11.5 20l2.6-5.6L21 4Z" />
    <path d="m9 13.5 12-9.5" />
  </Icon>
);
export const IconClock = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const IconStar = () => (
  <Icon fill="currentColor" strokeWidth="1.5">
    <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3Z" />
  </Icon>
);
/** Острое — язычок пламени. */
export const IconFlame = () => (
  <Icon>
    <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z" />
  </Icon>
);
/** Без мяса — листок. */
export const IconLeaf = () => (
  <Icon>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19 13 11" />
  </Icon>
);
/** Хит — пламя-звезда. */
export const IconHit = () => (
  <Icon fill="currentColor" strokeWidth="1.5">
    <path d="m12 3 2.4 5 5.6.7-4.1 3.9 1 5.6L12 15.4 7.1 18.2l1-5.6L4 8.7 9.6 8 12 3Z" />
  </Icon>
);
/** «Прийти на это» — стол с календарной отметкой. */
export const IconTableBook = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M8 3v4M16 3v4M4 10h16M9.5 15l2 2 3.5-3.5" />
  </Icon>
);
export const IconHall = () => (
  <Icon>
    <path d="M3 20h18M5 20V9l7-5 7 5v11" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);
export const IconTerrace = () => (
  <Icon>
    <path d="M3 10h18l-2-5H5l-2 5ZM6 10v10M18 10v10M3 20h18" />
  </Icon>
);
export const IconTapchan = () => (
  <Icon>
    <rect x="3" y="11" width="18" height="4" rx="1.5" />
    <path d="M5 15v5M19 15v5M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const IconCake = () => (
  <Icon>
    <path d="M4 20h16v-7H4v7ZM4 16c2 1.5 3 1.5 4 0s2-1.5 4 0 3 1.5 4 0 2-1.5 4 0M12 13V8M12 4c1 1.2 1 2 0 3-1-1-1-1.8 0-3Z" />
  </Icon>
);
export const IconBriefcase = () => (
  <Icon>
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </Icon>
);
export const IconFamily = () => (
  <Icon>
    <circle cx="8" cy="8" r="2.5" />
    <circle cx="16.5" cy="9.5" r="2" />
    <path d="M3 19v-1.5A4.5 4.5 0 0 1 7.5 13h1A4.5 4.5 0 0 1 13 17.5V19M14 19v-1a3.5 3.5 0 0 1 3.5-3.5h0A3.5 3.5 0 0 1 21 18v1" />
  </Icon>
);
/** Курьер на скутере — плитка агрегатора доставки. */
export const IconScooter = () => (
  <Icon>
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M9 17h5l2-8h-3M16 9l2 8M6 14l-1-6h4" />
  </Icon>
);
export const IconBag = () => (
  <Icon>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);
export const IconDish = () => (
  <Icon>
    <path d="M3 15h18a9 9 0 0 0-18 0ZM2 19h20M12 6V4" />
  </Icon>
);

/** Казан: логотип-знак. */
export const Kazan = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    <path d="M4 14h24a12 12 0 0 1-24 0Z" fill="currentColor" />
    <path d="M2 14h28M9 26l-1.5 3M23 26l1.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 9c-1.5-2 1.5-3 0-5M17 9c-1.5-2 1.5-3 0-5M22 9c-1.5-2 1.5-3 0-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
