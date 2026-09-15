// STUB — to be implemented by the hub-member agent. Each screen uses useAuth().
import { useAuth } from './AuthProvider';
import { Button, Card } from '@/components/ui';

export function BootScreen() {
  const { leaveBoot } = useAuth();
  return <Card className="p-8 text-center"><p className="text-muted">Opening your hub…</p><Button className="mt-4" onClick={leaveBoot}>Continue to sign in</Button></Card>;
}
export function SignInScreen() { return <Card className="p-8">SignInScreen — coming soon</Card>; }
export function VerifyEmailScreen() { return <Card className="p-8">VerifyEmailScreen — coming soon</Card>; }
export function OnboardingScreen() { return <Card className="p-8">OnboardingScreen — coming soon</Card>; }
export function PendingScreen() { return <Card className="p-8">PendingScreen — coming soon</Card>; }
