

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1">{children}</main>
    </div>
  );
}
