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
      className={`rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-tennessee uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
