import azixLogo from "@/assets/azix-logo.png";

const Footer = () => {
  return (
    <footer className="py-10 bg-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={azixLogo} alt="Azix logo" className="w-8 h-8 rounded-md object-contain" />
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
