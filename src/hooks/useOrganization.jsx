import { createContext, useContext, useMemo } from 'react';

/**
 * Organization context provides the current org's data and branding
 * to all child components. Populated by the auth layer.
 */

const OrganizationContext = createContext(null);

export function OrganizationProvider({ organization, children }) {
  const branding = useMemo(() => {
    if (!organization) return null;
    return {
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logo_url,
      primaryColor: organization.primary_color || '#1e3a5f',
      accentColor: organization.accent_color || '#dc2626',
      plan: organization.plan || 'free',
    };
  }, [organization]);

  return (
    <OrganizationContext.Provider value={{ organization, branding }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return ctx;
}
