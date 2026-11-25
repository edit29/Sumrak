'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push('/');
      }}
    >
      Назад
    </button>
  );
}
