import Image from 'next/image';

/**
 * Full-screen loading overlay. The page behind it stays in place and is blurred
 * while the seal spins.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
    >
      <div className="relative size-36">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <Image
          src="/assets/logo.png"
          alt=""
          width={128}
          height={128}
          className="absolute inset-2 size-32 rounded-full object-cover"
        />
      </div>
    </div>
  );
}
