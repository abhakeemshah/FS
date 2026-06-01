/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	async rewrites() {
		return [
			{ source: '/access', destination: '/login' },
			{ source: '/access/:path*', destination: '/login/:path*' },
		];
	},
};

module.exports = nextConfig;
