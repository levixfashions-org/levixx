import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Password field with a show / hide eye button. */
export const PasswordInput: React.FC<Props> = ({ className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} !pr-12`} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        onMouseDown={(e) => e.preventDefault()} // keep the cursor in the field
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-[10px] flex items-center justify-center text-[#8e8e93] hover:text-[#0b0b0f] hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5400]/40 transition-colors"
      >
        {show ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.9} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={1.9} />}
      </button>
    </div>
  );
};
