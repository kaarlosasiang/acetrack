export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  return <div>{status.toUpperCase()} Subscriptions Page - Super Admin</div>;
}
