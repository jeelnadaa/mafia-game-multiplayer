'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted bg-surface-2 border border-border rounded-none shadow-none select-none ${className}`}
    >
      {children}
    </kbd>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  kbd,
  className = '',
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  kbd?: string;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-sans font-medium rounded-[4px] transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-[#D9A441] disabled:opacity-40 disabled:cursor-not-allowed select-none border active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 min-h-[36px] gap-1.5 text-xs',
    md: 'px-4 py-2 min-h-[44px] gap-2 text-sm',
    lg: 'px-6 py-2.5 min-h-[52px] gap-2.5 text-base font-semibold',
  };

  const variantStyles = {
    primary: 'bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] border-transparent font-semibold shadow-md',
    secondary: 'bg-[#101216] hover:bg-[#171A20] text-[#ECE6D8] border-[#262A33] hover:border-[#6b6455]',
    accent: 'bg-[#D9A441] hover:bg-[#F0D79A] text-[#0A0B0E] border-transparent font-semibold shadow-md',
    danger: 'bg-[#171A20] text-[#fca5a5] border-[#B3363B]/60 hover:bg-[#B3363B] hover:text-white hover:border-[#B3363B]',
    outline: 'bg-transparent text-[#ECE6D8] border-[#6b6455] hover:border-[#D9A441] hover:text-[#ECE6D8]',
    ghost: 'bg-transparent hover:bg-[#171A20] text-[#A39D90] hover:text-[#ECE6D8] border-transparent hover:border-[#262A33]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      <span className="inline-flex items-center justify-center text-center">{children}</span>
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
}

export function Card({
  children,
  className = '',
  onClick,
  active = false,
  glowColor,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  glowColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[4px] border transition-colors ${
        active
          ? 'border-[#D9A441] bg-[#171A20] shadow-[0_0_15px_rgba(217,164,65,0.2)]'
          : 'border-[#262A33] bg-[#101216]'
      } ${onClick ? 'cursor-pointer hover:border-[#6b6455]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = 'muted',
  className = '',
}: {
  children: ReactNode;
  color?: 'mafia' | 'doctor' | 'police' | 'vigilante' | 'jester' | 'civilian' | 'god' | 'amber' | 'muted';
  className?: string;
}) {
  const colorMap = {
    mafia: 'bg-[#171A20] text-[#fca5a5] border-[#B3363B]/60',
    doctor: 'bg-[#171A20] text-[#a7f3d0] border-[#5E8C7B]/60',
    police: 'bg-[#171A20] text-[#93c5fd] border-[#5B7FA6]/60',
    vigilante: 'bg-[#171A20] text-[#fed7aa] border-[#C9A86A]/60',
    jester: 'bg-[#171A20] text-[#e9d5ff] border-[#8C6FA0]/60',
    civilian: 'bg-[#171A20] text-[#ECE6D8] border-[#262A33]',
    god: 'bg-[#D9A441] text-[#0A0B0E] border-transparent font-bold',
    amber: 'bg-[#171A20] text-[#D9A441] border-[#D9A441]/50',
    muted: 'bg-[#101216] text-[#A39D90] border-[#262A33]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[3px] text-[11px] font-sans font-medium border ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Chip({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value?: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-sans border transition-colors ${
        active
          ? 'bg-[#D9A441] text-[#0A0B0E] border-[#D9A441] font-semibold'
          : 'bg-[#101216] text-[#A39D90] border-[#262A33] hover:border-[#6b6455] hover:text-[#ECE6D8]'
      }`}
    >
      <span>{label}</span>
      {value !== undefined && <span className="opacity-75">({value})</span>}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#D9A441] disabled:opacity-40 ${
        checked ? 'bg-[#D9A441] border-[#D9A441]' : 'bg-[#171A20] border-[#262A33]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 mt-0.5 rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5 bg-[#0A0B0E]' : 'translate-x-1 bg-[#A39D90]'
        }`}
      />
    </button>
  );
}

export function Stepper({
  value,
  min = 0,
  max = 10,
  step = 1,
  onChange,
  disabled = false,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-[4px] border border-[#262A33] bg-[#101216]">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 flex items-center justify-center text-[#ECE6D8] hover:bg-[#171A20] hover:text-[#D9A441] rounded-l-[3px] disabled:opacity-30 font-mono text-sm transition-colors"
      >
        -
      </button>
      <span className="w-9 text-center font-mono text-sm font-bold text-[#D9A441] border-x border-[#262A33]">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 flex items-center justify-center text-[#ECE6D8] hover:bg-[#171A20] hover:text-[#D9A441] rounded-r-[3px] disabled:opacity-30 font-mono text-sm transition-colors"
      >
        +
      </button>
    </div>
  );
}

export function Avatar({
  avatarId = 1,
  size = 40,
  className = '',
}: {
  avatarId: number;
  size?: number;
  className?: string;
}) {
  const safeId = Math.min(12, Math.max(1, avatarId));
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-none border border-border bg-surface-2 flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      <img
        src={`/assets/avatars/${safeId}.webp`}
        alt={`Avatar ${safeId}`}
        className="w-full h-full object-cover" // Full vibrant colors enabled!
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-muted bg-surface-2 pointer-events-none -z-10">
        #{safeId}
      </div>
    </div>
  );
}

export function CountdownRing({
  remainingSeconds,
  totalSeconds,
  size = 36,
  strokeWidth = 3,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}) {
  const isUrgent = remainingSeconds <= 5 && remainingSeconds > 0;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-none font-sans text-xs font-semibold ${
      isUrgent ? 'border-white bg-white text-black animate-pulse' : 'border-border bg-surface-2 text-text'
    }`}>
      <span className="text-muted text-[11px]">Time</span>
      <span className="font-mono">{Math.max(0, Math.ceil(remainingSeconds))}s</span>
    </div>
  );
}

export function CenterTimer({
  phaseEndsAt,
  serverNow,
  label,
  className = '',
  size = 'md',
  noTimer = false,
}: {
  phaseEndsAt: number | null | undefined;
  serverNow?: number | null;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  noTimer?: boolean;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const offsetRef = React.useRef(0);

  // Synchronize server-to-client clock offset whenever serverNow is provided
  React.useEffect(() => {
    if (typeof serverNow === 'number' && serverNow > 0) {
      offsetRef.current = serverNow - Date.now();
    }
  }, [serverNow]);

  React.useEffect(() => {
    if (!phaseEndsAt || noTimer) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [phaseEndsAt, noTimer]);

  if (!phaseEndsAt || noTimer) return null;

  const effectiveNow = now + offsetRef.current;
  const remainingMs = Math.max(0, phaseEndsAt - effectiveNow);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs gap-2 h-9 min-h-[36px]',
    md: 'px-3.5 py-1.5 text-xs md:text-sm gap-2.5 h-10 min-h-[40px]',
    lg: 'px-4 py-2 text-sm md:text-base gap-3 h-11 min-h-[44px]',
  };

  const numberSizes = {
    sm: 'text-xs md:text-sm font-mono font-bold',
    md: 'text-sm md:text-base font-mono font-bold',
    lg: 'text-base md:text-lg font-mono font-bold',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      <div
        className={`inline-flex items-center border rounded-none transition-colors duration-150 ${sizeClasses[size]} ${
          isUrgent
            ? 'border-white bg-white text-black animate-pulse shadow-xl'
            : 'border-border bg-surface-2 text-text shadow-sm'
        }`}
      >
        <span
          className={`font-sans tracking-wider uppercase font-semibold text-[10px] md:text-xs ${
            isUrgent ? 'text-zinc-800' : 'text-muted'
          }`}
        >
          {label || 'Remaining'}
        </span>
        <span className={`font-mono tracking-wider ${numberSizes[size]}`}>
          {remainingSeconds}s
        </span>
      </div>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className={`relative z-10 w-full ${maxWidth} bg-[#101216] border border-[#262A33] rounded-[6px] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] text-[#ECE6D8] font-sans`}
          >
            <div className="flex items-start justify-between pb-3.5 border-b border-[#262A33] mb-5">
              <div>
                {title && (
                  <h3 className="d text-2xl sm:text-3xl font-extrabold tracking-[2px] uppercase text-[#ECE6D8] leading-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="t text-xs text-[#A39D90] mt-1 tracking-wide">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-transparent text-[#A39D90] hover:text-[#ECE6D8] border border-[#262A33] hover:border-[#6b6455] transition-colors ml-auto text-xl"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function MafiaWordmark({ className = 'h-8 text-bone' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 64"
      fill="currentColor"
      className={`inline-block select-none ${className}`}
      role="img"
      aria-label="Mafia: Shadows of the City"
    >
      <g className="font-extrabold tracking-widest">
        <path d="M12 56V8h14l12 28L50 8h14v48h-11V22l-11 25h-8L23 22v34H12z" />
        <path d="M78 56l18-48h14l18 48h-12l-4-12h-20l-4 12H78zm23-22h14l-7-20-7 20z" />
        <path d="M142 56V8h34v10h-23v13h20v10h-20v15h-11z" />
        <path d="M190 56V8h12v48h-12z" />
        <path d="M216 56l18-48h14l18 48h-12l-4-12h-20l-4 12h-14zm23-22h14l-7-20-7 20z" />
      </g>
      <line x1="8" y1="32" x2="280" y2="32" stroke="var(--ink-950)" strokeWidth="2.5" />
    </svg>
  );
}

export function RubberStamp({
  status = 'eliminated',
  variant,
  label,
  text,
  size = 'md',
  className = '',
}: {
  status?: 'eliminated' | 'survived' | 'saved';
  variant?: string;
  label?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg' | string;
  className?: string;
}) {
  const effectiveStatus = (variant === 'success' || status === 'survived') ? 'survived' : (variant === 'amber' || status === 'saved') ? 'saved' : 'eliminated';
  const defaultLabels = {
    eliminated: 'ELIMINATED',
    survived: 'SURVIVED',
    saved: 'SHIELDED',
  };
  const statusClasses = {
    eliminated: 'rubber-stamp-eliminated',
    survived: 'rubber-stamp-survived',
    saved: 'rubber-stamp-saved',
  };
  const sizeClasses: Record<string, string> = {
    sm: 'text-[9px] px-1.5 py-0.5 border',
    md: 'text-xs px-2.5 py-1 border-2',
    lg: 'text-base px-4 py-2 border-2',
  };
  const displayText = text || label || defaultLabels[effectiveStatus];

  return (
    <div className={`rubber-stamp ${statusClasses[effectiveStatus]} ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      <span>{displayText}</span>
    </div>
  );
}

export function RedactionShield({
  isRevealed,
  isRedacted,
  onToggle,
  label,
  children,
  className = '',
}: {
  isRevealed?: boolean;
  isRedacted?: boolean;
  onToggle?: ((revealed: boolean) => void) | (() => void);
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const activeRevealed = typeof isRevealed === 'boolean' ? isRevealed : !isRedacted;

  const handlePointerDown = () => {
    if (!onToggle) return;
    if (onToggle.length === 0) (onToggle as () => void)();
    else (onToggle as (r: boolean) => void)(true);
  };

  const handlePointerUp = () => {
    if (!onToggle) return;
    if (onToggle.length === 0) (onToggle as () => void)();
    else (onToggle as (r: boolean) => void)(false);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`relative inline-block cursor-pointer select-none ${className}`}
      title={label || "Hold mouse, touch, or Spacebar to reveal classified intel"}
    >
      <div className={`transition-all duration-200 ${activeRevealed ? 'revealed-ink' : 'redacted-ink'}`}>
        {children}
      </div>
    </div>
  );
}

export function TimerRing({
  remainingSeconds,
  totalSeconds,
  size = 36,
  strokeWidth = 3,
  className = '',
}: {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, remainingSeconds / Math.max(1, totalSeconds)));
  const offset = circumference * (1 - ratio);
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--line)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUrgent ? 'var(--blood)' : 'var(--lamp)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-200"
        />
      </svg>
      <span className={`absolute font-mono text-[10px] font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-bone'}`}>
        {Math.max(0, Math.ceil(remainingSeconds))}
      </span>
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  ariaLabel,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`hb flex items-center justify-center hover:border-bone transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function PaperCard({
  children,
  borderColor = '#B3363B',
  className = '',
}: {
  children: ReactNode;
  borderColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`p-5 rounded-[4px] shadow-2xl ${className}`}
      style={{
        background: '#ECE6D8',
        color: '#15130f',
        borderTop: `6px solid ${borderColor}`,
      }}
    >
      {children}
    </div>
  );
}

export function RedactionBar({
  width = '80%',
  className = '',
}: {
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`h-4 bg-[#0A0B0E] rounded-[1px] ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function PhaseTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`d text-3xl sm:text-[46px] font-extrabold tracking-[4px] uppercase text-[#ECE6D8] ${className}`}>
      {children}
    </div>
  );
}

export function NarratorLine({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`t text-base sm:text-[21px] text-[#A39D90] text-center ${className}`}>
      {children}
    </div>
  );
}

export function VoteToken({
  voterColor = '#B3363B',
  className = '',
}: {
  voterColor?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block w-[22px] h-[22px] rounded-full bg-[#D9A441] border-[3px] box-border ${className}`}
      style={{ borderColor: voterColor }}
    />
  );
}

export function LampCone({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[640px] h-[700px] z-0 ${className}`}
      style={{
        background: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(217,164,65,.24), transparent 70%)',
      }}
      aria-hidden="true"
    />
  );
}

