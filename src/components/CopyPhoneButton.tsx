import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const formatPhoneForClipboard = (raw: string): string => {
  const cleaned = (raw || '').trim();
  if (!cleaned) return '';
  
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }
  if (cleaned.startsWith('593')) {
    return `+${cleaned.replace(/\D/g, '')}`;
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 10) {
    return `+593${digits.slice(1)}`;
  }
  if (digits.length >= 9) {
    return `+${digits}`;
  }
  return digits;
};

interface CopyPhoneButtonProps {
  phone: string;
  className?: string;
  iconClassName?: string;
  title?: string;
}

export const CopyPhoneButton: React.FC<CopyPhoneButtonProps> = ({
  phone,
  className = '',
  iconClassName = 'w-3.5 h-3.5',
  title = 'Copiar número de WhatsApp'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!phone) return;

    const formatted = formatPhoneForClipboard(phone);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = formatted;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar número:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? '¡Copiado al portapapeles!' : title}
      aria-label="Copiar número"
      className={`inline-flex items-center justify-center p-1 rounded-md transition-all active:scale-95 ${
        copied
          ? 'bg-emerald-100 text-emerald-700 shadow-xs'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
      } ${className}`}
    >
      {copied ? (
        <Check className={`${iconClassName} text-emerald-600 animate-in zoom-in-50 duration-200`} />
      ) : (
        <Copy className={iconClassName} />
      )}
    </button>
  );
};
