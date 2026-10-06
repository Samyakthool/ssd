import { redirect } from 'next/navigation';

export default async function VerifyPage(props: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const params = await Promise.resolve(props.params);
  const sainikId = params?.id || '';
  redirect(`/verify?id=${encodeURIComponent(sainikId)}`);
}
