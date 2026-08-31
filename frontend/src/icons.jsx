const Icon = ({ children, size = 18, ...props }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const IconPatient = (p) => <Icon {...p}><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></Icon>;
export const IconConsult = (p) => <Icon {...p}><path d="M4 5h16v10H8l-4 4V5Z"/></Icon>;
export const IconMic = (p) => <Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></Icon>;
export const IconExtract = (p) => <Icon {...p}><circle cx="10" cy="10" r="6.5"/><path d="m19 19-3.8-3.8"/></Icon>;
export const IconMerge = (p) => <Icon {...p}><path d="M5 4c5 0 5 8 7 8s2-8 7-8"/><path d="M5 20c5 0 5-8 7-8"/></Icon>;
export const IconShield = (p) => <Icon {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
export const IconFile = (p) => <Icon {...p}><path d="M6 3h9l4 4v14H6V3Z"/><path d="M14 3v5h5"/></Icon>;
export const IconAlert = (p) => <Icon {...p}><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></Icon>;
export const IconArrow = (p) => <Icon {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></Icon>;

export const LogoMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18.5" stroke="#16302B" strokeWidth="1.4" />
    <path d="M9 14c8 0 6 12 14 12" stroke="#2B6CB0" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M9 26c8 0 6-12 14-12" stroke="#B45309" strokeWidth="2.6" strokeLinecap="round" fill="none" />
  </svg>
);

export const STEP_ICONS = [IconPatient, IconConsult, IconMic, IconExtract, IconMerge, IconShield, IconCheck, IconFile];