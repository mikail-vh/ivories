import { SongDetail } from '@/components/song/SongDetail';

export const metadata = {
  title: 'Song · Music',
};

export default async function SongRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SongDetail id={id} />;
}
