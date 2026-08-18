import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[71.875rem] px-5 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * One section, one giant word. The word is the navigation: you can tell where
 * you are on the page from across the room.
 */
export function Section({
  id,
  word,
  lead,
  children,
}: {
  id?: string;
  word: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-20 py-24 sm:py-32">
      <Container>
        <header
          data-reveal
          className="mb-14 flex flex-col items-center text-center sm:mb-20"
        >
          <h2 className="text-display">{word}</h2>
          {lead && (
            <p className="text-lead mt-6 max-w-[46ch] text-pretty">{lead}</p>
          )}
        </header>
        {children}
      </Container>
    </section>
  );
}
