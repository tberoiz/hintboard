export function getSubdomain(host: string): string | null {
  const parts = (host.split(":")[0] || host).split(".");

  // localhost:3000 → ['localhost']
  // org.localhost:3000 → ['org', 'localhost']
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0]!;
  }

  // hintboard.app → ['z13', 'dev'] → null (main domain)
  // www.hintboard.app → ['www', 'z13', 'dev'] → null (treat www as main domain)
  // org.hintboard.app → ['org', 'z13', 'dev'] → 'org' (subdomain)
  if (parts.length >= 3) {
    const subdomain = parts[0]!;

    // Treat 'www' as if it's the main domain (no subdomain)
    if (subdomain === "www") {
      return null;
    }

    return subdomain;
  }

  return null;
}
