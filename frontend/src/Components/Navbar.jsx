import { useState } from "react";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Github", href: "https://github.com/meowmeowrahul/trainsthti" },
];

const Navbar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded bg-black flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                <img src="/trainsthti-logo.png" alt="Logo" />
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-gray-900">
              Trainsthti
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <ul className="flex gap-6 text-sm font-medium text-gray-500">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="hover:text-black transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <button className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
              R
            </button>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileOpen((p) => !p)}
              className="text-gray-500 hover:text-black focus:outline-none"
            >
              {isMobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {isMobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            <ul className="space-y-1 text-sm font-medium text-gray-600">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      handleNavClick(e, item.href);
                      setIsMobileOpen(false);
                    }}
                    className="block rounded-md px-3 py-2 hover:bg-gray-50 hover:text-black"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
