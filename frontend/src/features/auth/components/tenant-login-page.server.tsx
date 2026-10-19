import { authApi, type ResolvedTenant } from "../api";
import { LoginScreen } from "./login-screen";

type TenantLoginPageProps = {
  tenantSlug: string;
};

/**
 * Resolve the workspace before streaming the login screen. This keeps the
 * first browser paint identical to the hydrated UI and prevents refresh-time
 * layout shifts from a temporary loading page.
 */
export async function TenantLoginPage({ tenantSlug }: TenantLoginPageProps) {
  let tenant: ResolvedTenant;

  try {
    tenant = await authApi.resolveTenant(tenantSlug);
  } catch {
    return (
      <main
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          color: "#26364d",
          fontFamily: "var(--font-sans)",
          textAlign: "center",
        }}
      >
        <div>
          <strong style={{ display: "block", fontSize: 20 }}>
            School workspace unavailable
          </strong>
          <span
            style={{
              display: "block",
              marginTop: 8,
              color: "#68778d",
              fontSize: 14,
            }}
          >
            Check the workspace URL or contact your platform administrator.
          </span>
        </div>
      </main>
    );
  }

  return (
    <LoginScreen
      mode="school"
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
    />
  );
}
