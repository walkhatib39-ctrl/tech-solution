import { NextRequest, NextResponse } from "next/server";
import {
  isProjectsAuthError,
  requireProjectsAuth,
} from "@/lib/projectsAuth";
import {
  getProjectsDataForUser,
  saveProjectsDataForUser,
} from "@/lib/projectsStore";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  try {
    const currentUser = await requireProjectsAuth();

    return NextResponse.json({
      success: true,
      currentUser,
      data: await getProjectsDataForUser(currentUser),
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
    const currentUser = await requireProjectsAuth();

    const body = await request.json();

    if (!body || !Array.isArray(body.projects) || !Array.isArray(body.tasks)) {
      return NextResponse.json(
        { error: "Invalid projects payload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      currentUser,
      data: await saveProjectsDataForUser(body, currentUser),
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
