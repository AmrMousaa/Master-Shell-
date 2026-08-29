import { useEffect, useState } from 'react';
import { getContext } from '@microsoft/power-apps/app';

export function useCurrentUser() {
  const [fullName, setFullName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getContext().then((context) => {
      if (!cancelled) setFullName(context.user.fullName);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { fullName };
}
