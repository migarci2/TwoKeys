import Link from "next/link";
import { Container } from "@/components/site/Section";

export function Cta() {
  return (
    <section className="relative py-28 sm:py-40">
      <Container>
        <div className="flex flex-col items-center gap-8 text-center">
          <h2 className="text-display max-w-[14ch] text-balance">
            Both keys or nothing
          </h2>
          <p className="text-lead max-w-[40ch] text-pretty">
            Watch the whole thing in four minutes: the ask, the yes that
            disappears, and one real switch being flipped.
          </p>
          <Link
            href="/demo"
            transitionTypes={["nav-forward"]}
            className="rounded-btn bg-accent px-7 py-4 font-medium text-on-accent transition hover:opacity-90"
          >
            Open the demo
          </Link>
        </div>
      </Container>
    </section>
  );
}
