"use client";

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";


export default function MainPage() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let active = true;

    return () => {
      active = false;
    };
  }, [offset]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold">Nothing here</h1>
    </main>
  );
}
