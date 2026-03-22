export async function GET() {
  return Response.json({ key: process.env.GEMINI_API_KEY });
}
