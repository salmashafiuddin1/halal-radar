export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
        <p className="text-sm text-muted-foreground">
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/salma-shafi/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            Salma Shafi
          </a>
        </p>
        <p className="text-xs text-muted-foreground">HalalRadar © 2026</p>
      </div>
    </footer>
  );
}
