import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "duesly_session"

async function getSessionFromRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "")
    await jwtVerify(token, secret, { algorithms: ["HS256"] })
    return true
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicPaths = ["/", "/login", "/signup", "/auth", "/pay"]
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isApiPublic = pathname === "/api/auth/login" || pathname === "/api/auth/signup" || pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/pay")

  if (isPublic || isApiPublic) {
    return NextResponse.next()
  }

  const isAuthenticated = await getSessionFromRequest(request)

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
