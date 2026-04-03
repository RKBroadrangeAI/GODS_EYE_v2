import { POST as advancedPost } from "@/app/api/ai/advanced/route";

export async function POST(request: Request) {
  return advancedPost(request);
}
