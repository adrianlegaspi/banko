import RoomSetup from '@/components/RoomSetup';
export default async function JoinRoom({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <RoomSetup joining initialCode={typeof code === 'string' ? code : ''} />
  );
}
