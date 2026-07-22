// cypod-telemetry
const base = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
export function ActivityIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M3 12h4l2.2-7 4.2 14 2.3-7H21" /></svg>; }
export function DeviceIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 7h6M10 17h4"/></svg>; }
export function AlertIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/></svg>; }
export function BatteryIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4M6 10v4"/></svg>; }
export function TemperatureIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a5 5 0 1 0 8 0Z"/><path d="M10 10v7"/></svg>; }
export function RefreshIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>; }
export function PlusIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M12 5v14M5 12h14"/></svg>; }
export function LogoutIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M10 17l5-5-5-5M15 12H3M14 3h6v18h-6"/></svg>; }
export function CloseIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>; }
export function MapIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>; }
export function ClockIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>; }
export function ShieldIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>; }
export function DatabaseIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>; }
export function SearchIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
export function FilterIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M4 5h16M7 12h10M10 19h4"/></svg>; }
export function CheckIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="m5 12 4 4L19 6"/></svg>; }
export function ChevronLeftIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="m15 18-6-6 6-6"/></svg>; }
export function ChevronRightIcon(props) { return <svg viewBox="0 0 24 24" {...base} {...props}><path d="m9 18 6-6-6-6"/></svg>; }
