import { supabase } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getProfile() {
  const res = await fetch(`${BASE_URL}/profile`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function updateProfile(data: {
  nickname?: string;
  default_style?: string;
  topics?: string[];
  diary_length?: string;
}) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createDiary(diaryDate: string, style = "casual") {
  const res = await fetch(`${BASE_URL}/diaries`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ diary_date: diaryDate, style }),
  });
  return res.json();
}

export async function searchDiaries(q: string) {
  const res = await fetch(`${BASE_URL}/diaries/search?q=${encodeURIComponent(q)}`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function listDiaries() {
  const res = await fetch(`${BASE_URL}/diaries`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getDiary(diaryId: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function uploadPhoto(diaryId: string, file: File) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

export async function generateDraft(diaryId: string, memo: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/generate-draft`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ memo }),
  });
  return res.json();
}

export async function generateQuestions(diaryId: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/generate-questions`, {
    method: "POST",
    headers: await getHeaders(),
  });
  return res.json();
}

export async function updateDiaryContent(diaryId: string, title: string, content: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/content`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify({ title, content }),
  });
  return res.json();
}

export async function deleteDiary(diaryId: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getDiaryMessages(diaryId: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/messages`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getRevisions(diaryId: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/revisions`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function restoreRevision(diaryId: string, content: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/revisions/restore`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function refineDiary(diaryId: string, message: string) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/refine`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function finalizeDiary(diaryId: string, answers: { question: string; answer: string }[]) {
  const res = await fetch(`${BASE_URL}/diaries/${diaryId}/finalize`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ answers }),
  });
  return res.json();
}
