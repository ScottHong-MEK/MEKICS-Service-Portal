import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // 정적 HTML 내보내기
  images: {
    unoptimized: true, // 이미지 최적화 에러 방지
  },
  basePath: '/MEKICS-Service-Portal', // GitHub Pages 경로
  eslint: {
    ignoreDuringBuilds: true, // 빌드 시 ESLint 에러 무시
  },
  typescript: {
    ignoreBuildErrors: true, // 빌드 시 타입 에러 무시
  },
};

export default nextConfig;