import Image from 'next/image';
import { LoginForm } from './LoginForm';

/**
 * Login page for the AUDA FieldTrack Admin Panel. Standalone (no app shell): the AUDA
 * building on the left (hidden on small screens), the sign-in form on the right.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/assets/login.png"
          alt="AUDA office building"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-sidebar via-sidebar/40 to-sidebar/10" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-sm font-medium tracking-widest text-white/70 uppercase">
            Ahmedabad Urban Development Authority
          </p>
          <p className="mt-2 max-w-md text-3xl font-semibold leading-tight">
            Field inspections, attendance and challans in one place.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/assets/logo.png"
              alt="AUDA logo"
              width={72}
              height={72}
              priority
              className="size-18 rounded-2xl object-contain"
            />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">AUDA FieldTrack</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to the administration portal</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
