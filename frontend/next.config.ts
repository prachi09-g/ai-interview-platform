import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces a minimal, self-contained server bundle (only the files
  // actually needed at runtime, node_modules pruned to production deps)
  // for the Docker image built in frontend.Dockerfile — without this the
  // image would need the entire frontend/node_modules copied in.
  output: 'standalone',
  eslint: {
    dirs: ['app', 'components', 'lib', 'store', 'services', 'types', 'hooks'],
  },
};

export default nextConfig;
