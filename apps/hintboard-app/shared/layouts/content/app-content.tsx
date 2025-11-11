export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full mx-auto overflow-hidden">{children}</div>
  );
}
