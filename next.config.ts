import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // GitHub Pages 배포를 위한 정적 내보내기 설정
  images: {
    unoptimized: true, // 이미지 최적화 오류 방지
  },
  basePath: '/MEKICS-Service-Portal', // 저장소 이름 경로 맞춤
};

export default nextConfig;