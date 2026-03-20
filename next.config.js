/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16: moved out of `experimental`
  serverExternalPackages: ['mysql2', 'bcryptjs', 'node-cron', 'nodemailer', 'ssh2'],

  output: 'standalone',

  // Allow the production domain to reach HMR in dev mode
  allowedDevOrigins: ['vpnstore.1stcs.gg'],
}

module.exports = nextConfig
