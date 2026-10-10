'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted bg-surface-2 border border-border rounded shadow-sm ${className}`}
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
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  kbd?: string;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] gap-1.5',
    md: 'px-4 py-2 text-sm min-h-[44px] gap-2',
    lg: 'px-6 py-3 text-base min-h-[52px] gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-surface-2 hover:bg-border text-text border border-border focus:ring-border',
    secondary: 'bg-surface hover:bg-surface-2 text-text border border-border focus:ring-border',
    danger: 'bg-mafia text-white hover:bg-mafia/90 shadow-[0_0_15px_rgba(229,56,59,0.3)] focus:ring-mafia',
    accent: 'bg-day-amber text-bg font-semibold hover:bg-day-amber/90 shadow-[0_0_15px_rgba(242,184,75,0.3)] focus:ring-day-amber',
    ghost: 'bg-transparent hover:bg-surface-2/60 text-muted hover:text-text focus:ring-border',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      <span>{children}</span>
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
      style={active && glowColor ? { boxShadow: `0 0 20px ${glowColor}` } : {}}
      className={`rounded-xl border transition-all duration-200 ${
        active ? 'border-text bg-surface-2' : 'border-border bg-surface'
      } ${onClick ? 'cursor-pointer hover:border-muted' : ''} ${className}`}
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
    mafia: 'bg-mafia/15 text-mafia border-mafia/30',
    doctor: 'bg-doctor/15 text-doctor border-doctor/30',
    police: 'bg-police/15 text-police border-police/30',
    vigilante: 'bg-vigilante/15 text-vigilante border-vigilante/30',
    jester: 'bg-jester/15 text-jester border-jester/30',
    civilian: 'bg-civilian/15 text-civilian border-civilian/30',
    god: 'bg-god/15 text-god border-god/30',
    amber: 'bg-day-amber/15 text-day-amber border-day-amber/30',
    muted: 'bg-surface-2 text-muted border-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${colorMap[color]} ${className}`}
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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-border text-text border-text'
          : 'bg-surface text-muted border-border hover:border-muted hover:text-text'
      }`}
    >
      <span>{label}</span>
      {value !== undefined && <span className="opacity-70">· {value}</span>}
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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 ${
        checked ? 'bg-day-amber' : 'bg-surface-2'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
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
    <div className="inline-flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 flex items-center justify-center text-text hover:bg-border rounded disabled:opacity-30"
      >
        -
      </button>
      <span className="w-8 text-center text-xs font-mono font-semibold text-text">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 flex items-center justify-center text-text hover:bg-border rounded disabled:opacity-30"
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
      className={`relative rounded-full overflow-hidden border border-border bg-surface-2 flex items-center justify-center shrink-0 ${className}`}
    >
      <img
        src={`/assets/avatars/${safeId}.webp`}
        alt={`Avatar ${safeId}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to stylized SVG placeholder if image is missing
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted bg-surface-2 pointer-events-none -z-10">
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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalSeconds > 0 ? Math.max(0, remainingSeconds / totalSeconds) : 0;
  const offset = circumference - fraction * circumference;
  const isUrgent = remainingSeconds <= 5 && remainingSeconds > 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#232736"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUrgent ? '#E5383B' : '#F2B84B'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300"
        />
      </svg>
      <span
        className={`absolute font-mono text-[11px] font-bold ${
          isUrgent ? 'text-mafia animate-pulse' : 'text-text'
        }`}
      >
        {Math.max(0, Math.ceil(remainingSeconds))}
      </span>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`relative z-10 w-full ${maxWidth} bg-surface border border-border rounded-2xl p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              {title && <h3 className="text-lg font-heading font-semibold text-text">{title}</h3>}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors ml-auto"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
