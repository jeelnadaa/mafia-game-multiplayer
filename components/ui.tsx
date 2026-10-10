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
    'relative inline-flex items-center justify-center font-sans text-xs md:text-sm font-medium rounded-none transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-40 disabled:cursor-not-allowed select-none border active:scale-[0.99]';

  const sizeStyles = {
    sm: 'px-3 py-1.5 min-h-[36px] gap-1.5 text-xs',
    md: 'px-4 py-2 min-h-[42px] gap-2 text-xs md:text-sm',
    lg: 'px-6 py-2.5 min-h-[46px] gap-2.5 text-sm',
  };

  const variantStyles = {
    primary: 'bg-white text-black border-white hover:bg-zinc-200 focus:ring-white',
    secondary: 'bg-surface-2 hover:bg-zinc-800 text-text border-border hover:border-zinc-500 focus:ring-zinc-400',
    accent: 'bg-white text-black border-white hover:bg-zinc-200 focus:ring-white',
    danger: 'bg-surface-2 text-white border-zinc-600 hover:bg-white hover:text-black hover:border-white focus:ring-white',
    outline: 'bg-transparent text-text border-border hover:border-text hover:bg-surface-2 focus:ring-zinc-400',
    ghost: 'bg-transparent hover:bg-surface-2 text-muted hover:text-text border-transparent hover:border-border focus:ring-zinc-500',
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
      className={`rounded-none border transition-colors ${
        active ? 'border-white bg-surface-2' : 'border-border bg-surface'
      } ${onClick ? 'cursor-pointer hover:border-zinc-500' : ''} ${className}`}
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
    mafia: 'bg-surface-2 text-white border-zinc-500',
    doctor: 'bg-surface-2 text-zinc-200 border-zinc-600',
    police: 'bg-surface-2 text-zinc-100 border-zinc-400',
    vigilante: 'bg-surface-2 text-zinc-300 border-zinc-600',
    jester: 'bg-surface-2 text-zinc-200 border-zinc-500',
    civilian: 'bg-surface-2 text-zinc-400 border-zinc-700',
    god: 'bg-white text-black border-white',
    amber: 'bg-surface-2 text-zinc-100 border-zinc-400',
    muted: 'bg-surface-2 text-muted border-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-none text-[11px] font-sans font-medium border ${colorMap[color]} ${className}`}
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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-sans border transition-colors ${
        active
          ? 'bg-white text-black border-white'
          : 'bg-surface text-muted border-border hover:border-zinc-500 hover:text-text'
      }`}
    >
      <span>{label}</span>
      {value !== undefined && <span className="opacity-70">({value})</span>}
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
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-none border border-border transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-40 bg-surface-2`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 mt-0.5 rounded-none transition-transform duration-150 ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-zinc-600'
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
    <div className="inline-flex items-center rounded-none border border-border bg-surface-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 flex items-center justify-center text-text hover:bg-zinc-800 rounded-none disabled:opacity-30 font-mono text-sm"
      >
        -
      </button>
      <span className="w-8 text-center text-xs font-mono font-semibold text-text border-x border-border">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 flex items-center justify-center text-text hover:bg-zinc-800 rounded-none disabled:opacity-30 font-mono text-sm"
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
            className="fixed inset-0 bg-black/85"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`relative z-10 w-full ${maxWidth} bg-surface border border-border rounded-none p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              {title && <h3 className="text-sm font-sans font-bold text-text">{title}</h3>}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-none text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-border transition-colors ml-auto"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
