import { CSSProperties, useId } from 'react';

export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  helpText?: string;
  size?: ToggleSize;
  disabled?: boolean;
}

const sizeMap: Record<ToggleSize, { w: number; h: number; knob: number; pad: number }> = {
  sm: { w: 36, h: 20, knob: 16, pad: 2 },
  md: { w: 44, h: 24, knob: 20, pad: 2 },
  lg: { w: 56, h: 30, knob: 26, pad: 2 },
};

export default function Toggle({
  checked,
  onChange,
  label,
  helpText,
  size = 'md',
  disabled = false,
}: ToggleProps) {
  const id = useId();
  const dims = sizeMap[size];

  const switchStyle: CSSProperties = {
    position: 'relative',
    width: dims.w,
    height: dims.h,
    borderRadius: dims.h / 2,
    backgroundColor: checked ? 'var(--red)' : 'rgba(255,255,255,0.08)',
    boxShadow: checked
      ? '0 0 12px rgba(251,44,90,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)'
      : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    flexShrink: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    border: 'none',
    padding: 0,
  };

  const knobStyle: CSSProperties = {
    position: 'absolute',
    top: dims.pad,
    left: checked ? dims.w - dims.knob - dims.pad : dims.pad,
    width: dims.knob,
    height: dims.knob,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'left 0.2s ease',
  };

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: label || helpText ? 'flex-start' : 'center',
    gap: 12,
  };

  const textStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minHeight: dims.h,
    justifyContent: 'center',
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--bright)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const helpStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--muted)',
  };

  return (
    <div style={wrapperStyle}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-describedby={helpText ? `${id}-help` : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={switchStyle}
      >
        <span style={knobStyle} aria-hidden="true" />
      </button>
      {(label || helpText) && (
        <div style={textStyle}>
          {label && (
            <label htmlFor={id} id={`${id}-label`} style={labelStyle}>
              {label}
            </label>
          )}
          {helpText && (
            <span id={`${id}-help`} style={helpStyle}>
              {helpText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
