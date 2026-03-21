const Footer = () => {
  return (
    <footer className="py-10 bg-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-sm">A</span>
            </div>
            <span className="font-heading font-bold text-background">Azix</span>
          </div>
          <p className="text-sm text-background/50">
            © {new Date().getFullYear()} Azix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
