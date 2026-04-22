import { NextRequest, NextResponse } from "next/server";
import {
  isProjectsAuthError,
  requireProjectsAuth,
} from "@/lib/projectsAuth";
import { getProjectsData, saveProjectsData } from "@/lib/projectsStore";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  try {
    await requireProjectsAuth();

    return NextResponse.json({
      success: true,
      data: await getProjectsData(),
    });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return unauthorizedResponse();
    }

    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireProjectsAuth();

    const body = await request.json();

    if (!body || !Array.isArray(body.projects) || !Array.isArray(body.tasks)) {
      return NextResponse.json(
        { error: "Invalid projects payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: await saveProjectsData(body),
    });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return unauthorizedResponse();
    }

    console.error("Save projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
