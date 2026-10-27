import { LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingBrand() {
  return (
    <Link to="/" className="landing-brand" aria-label="Sticky Mind Grid home">
      <span className="landing-brand-icon">
        <LayoutGrid size={20} strokeWidth={2.2} />
      </span>
      <span>
        sticky mind<span className="landing-brand-grid"> grid</span>
        <span className="landing-brand-dot">.</span>
      </span>
    </Link>
  );
}
