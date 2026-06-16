import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  listCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../lib/services/category-service';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const payload = await jwtVerify(token);
    return payload as { id: string; email?: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const slug = url.searchParams.get('slug');

  if (id) {
    const category = await getCategoryById(id);
    return category
      ? NextResponse.json({ success: true, category })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (slug) {
    const category = await getCategoryBySlug(slug);
    return category
      ? NextResponse.json({ success: true, category })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const categories = await listCategories();
  return NextResponse.json({ success: true, categories });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const category = await createCategory(body);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    const body = await req.json();
    const category = await updateCategory(id, body);
    return NextResponse.json({ success: true, category });
  } catch (err) {
    console.error('Update category error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
