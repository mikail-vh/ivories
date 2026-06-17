import { SetlistDetail } from '@/components/setlist/SetlistDetail';

export const metadata = {
  title: 'Setlist · Music',
};

export default async function SetlistRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SetlistDetail id={id} />;
}
