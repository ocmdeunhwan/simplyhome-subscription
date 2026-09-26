import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 글 데이터(data/posts.json)는 코드가 아니라 파일이라, 배포할 때 서버에 같이 실어 보낸다.
  outputFileTracingIncludes: {
    "/api/subscription": ["./data/posts.json"],
  },
};

export default nextConfig;
