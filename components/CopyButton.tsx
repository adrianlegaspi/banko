'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/clipboard';
export default function CopyButton({
  value,
  label = 'Copy code',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          setError('');
          try {
            await copyText(value, navigator.clipboard);
            setCopied(true);
          } catch (failure) {
            setError((failure as Error).message);
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : label}
      </Button>
      <span className="sr-only" role="status">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      {error && (
        <div className="copy-fallback" role="alert">
          <p>{error}</p>
          <input
            aria-label="Text to copy"
            readOnly
            value={value}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
