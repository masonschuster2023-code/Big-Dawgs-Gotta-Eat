export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] bg-white/95 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:bg-neutral-900/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_-12px_rgba(0,0,0,0.5)] ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-xs font-semibold tracking-wide text-tennessee uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
