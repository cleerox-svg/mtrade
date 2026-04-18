import { ReactNode, CSSProperties, ButtonHTMLAttributes, useState } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
}

const sizeMap: Record<ButtonSize, { height: number; padX: number; fontSize: number }> = {
  sm: { height: 44, padX: 14, fontSize: 13 },
  md: { height: 44, padX: 18, fontSize: 14 },
  lg: { height: 52, padX: 24, fontSize: 16 },
};

function getVariantStyle(variant: ButtonVariant, hover: boolean): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--red)',
        color: 'var(--white)',
        border: '1px solid transparent',
        boxShadow: hover
          ? '0 0 24px rgba(251,44,90,0.55), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 0 16px rgba(251,44,90,0.35), 0 2px 8px rgba(0,0,0,0.25)',
      };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        color: 'var(--label)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'none',
      };
    case 'danger':
      return {
        backgroundColor: 'var(--danger)',
        color: 'var(--white)',
        border: '1px solid transparent',
        boxShadow: hover
          ? '0 0 20px rgba(239,68,68,0.5), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 0 12px rgba(239,68,68,0.3), 0 2px 8px rgba(0,0,0,0.25)',
      };
    case 'ghost':
    default:
      return {
        backgroundColor: 'transparent',
        color: 'var(--muted)',
        border: '1px solid transparent',
        boxShadow: 'none',
      };
  }
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'mtrade-spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const dims = sizeMap[size];
  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    height: dims.height,
    padding: `0 ${dims.padX}px`,
    borderRadius: 10,
    fontFamily: 'Outfit, sans-serif',
    fontSize: dims.fontSize,
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, transform 0.1s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    ...getVariantStyle(variant, hover && !isDisabled),
    ...style,
  };

  return (
    <>
      <style>{`@keyframes mtrade-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        {...rest}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={className}
        style={baseStyle}
        onMouseEnter={(e) => {
          setHover(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHover(false);
          onMouseLeave?.(e);
        }}
      >
        {loading ? (
          <>
            <Spinner size={dims.fontSize + 2} />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    </>
  );
}
