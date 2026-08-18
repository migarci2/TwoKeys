import { Container } from "./Section";
import { Lockup } from "./Mark";

export function Footer() {
  return (
    <footer className="relative border-t py-12">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          <Lockup id="foot" />
          <p className="text-sm text-ink-2">
            Built with <span aria-hidden>♥</span>
            <span className="sr-only">love</span> for a hackathon.
          </p>
        </div>
      </Container>
    </footer>
  );
}
