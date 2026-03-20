import { Link } from "react-router-dom";
import { appRoutes } from "../app/routes";

export function NotFoundPage() {
  return (
    <section className="panel">
      <p className="eyebrow">404</p>
      <h2>Navigation drift</h2>
      <p className="subtle-text">The requested page could not be located in the response network.</p>
      <div className="button-row">
        <Link className="button primary" to={appRoutes.landing}>
          Return to landing
        </Link>
        <Link className="button ghost" to={appRoutes.dashboard}>
          Open dashboard
        </Link>
      </div>
    </section>
  );
}
