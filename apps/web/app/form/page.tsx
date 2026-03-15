"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  SiteGenerationInput,
  PageInput,
  SectionInput,
  CommonBlockInput,
  TextMode,
  ImageMode,
} from "@web-site-generator/shared";
import {
  loadDraft,
  saveDraft,
  FORM_DRAFT_KEY,
  type FormDraft,
} from "./formDraftStorage";

const TEXT_MODE_OPTIONS: { value: TextMode; label: string }[] = [
  { value: "omakase", label: "AIおまかせ" },
  { value: "complement", label: "AI補完" },
  { value: "as_is", label: "入力内容そのまま" },
];

/** サイト概要・共通ヘッダー・共通フッター用（AIおまかせなし） */
const TEXT_MODE_OPTIONS_NO_OMAKASE: { value: TextMode; label: string }[] = [
  { value: "complement", label: "AI補完" },
  { value: "as_is", label: "入力内容そのまま" },
];

const IMAGE_MODE_OPTIONS: { value: ImageMode; label: string }[] = [
  { value: "omakase", label: "AIおまかせ" },
  { value: "attach", label: "画像添付" },
  { value: "none", label: "画像なし" },
];

/** 入力欄の placeholder 用（送信値には含めない）。初期値は空で placeholder のみ表示する。 */
const PAGE_PLACEHOLDERS: { name: string; heading: string; content: string }[] = [
  { name: "例: トップ", heading: "例: 株式会社XX", content: "例: キャッチコピー。空欄でAI補完・おまかせ可。" },
  { name: "例: 会社概要", heading: "例: 会社概要", content: "例: 会社概要の説明文。空欄でAI補完・おまかせ可。" },
  { name: "例: 実績", heading: "例: 実績", content: "例: 実績紹介の概要。空欄でAI補完・おまかせ可。" },
  { name: "例: サービス紹介", heading: "例: サービス紹介", content: "例: 提供サービスの概要。空欄でAI補完・おまかせ可。" },
  { name: "例: お問い合わせ", heading: "例: お問い合わせ", content: "例: お問い合わせの案内文。空欄でAI補完・おまかせ可。" },
];

function getPlaceholderForPage(i: number): { name: string; heading: string; content: string } {
  return (
    PAGE_PLACEHOLDERS[i] ?? {
      name: "例: ページ名",
      heading: "例: セクション見出し",
      content: "例: このページの概要テキスト。空欄でAI補完・おまかせ可。",
    }
  );
}

function defaultSection(): SectionInput {
  return {
    heading: "",
    content: "",
    contentOmakase: false,
    headingMode: "as_is",
    contentMode: "complement",
  };
}

function defaultPage(i: number): PageInput {
  return {
    path: i === 0 ? "/" : `/page-${i + 1}`,
    name: "",
    sections: [
      {
        heading: "",
        content: "",
        contentOmakase: false,
        headingMode: "as_is",
        contentMode: "complement",
        image: { type: "omakase" },
      },
      defaultSection(),
    ],
    heroSection: true,
  };
}

function defaultCommonBlock(): CommonBlockInput & { mode: TextMode } {
  return { text: "", mode: "omakase" };
}

function defaultCommonBlockNoOmakase(): CommonBlockInput & { mode: TextMode } {
  return { text: "", mode: "complement" };
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debouncedValue;
}

export default function FormPage() {
  const router = useRouter();

  const [siteDescription, setSiteDescription] = useState(defaultCommonBlockNoOmakase());
  const [pageCount, setPageCount] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [headerContent, setHeaderContent] = useState(defaultCommonBlockNoOmakase());
  const [footerContent, setFooterContent] = useState(defaultCommonBlockNoOmakase());
  const [pages, setPages] = useState<PageInput[]>([defaultPage(0)]);
  const [designPreference, setDesignPreference] = useState(defaultCommonBlock());
  /** クライアントで下書き復元が終わったら true。これが true になるまで保存しない（仕様: 復元完了まで保存しない） */
  const [restored, setRestored] = useState(false);
  const restoredRef = useRef(false);
  /** セクションごとの添付画像。key: "pageIndex_sectionIndex" */
  const [sectionFiles, setSectionFiles] = useState<Record<string, File>>({});
  const sectionFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = loadDraft(window.localStorage);
    if (draft) {
      setSiteDescription(draft.siteDescription);
      setPageCount(draft.pageCount);
      setHeaderContent(draft.headerContent);
      setFooterContent(draft.footerContent);
      setPages(draft.pages);
      setDesignPreference(draft.designPreference);
    }
    setRestored(true);
  }, []);

  const draft = useMemo<FormDraft>(
    () => ({
      siteDescription,
      pageCount,
      headerContent,
      footerContent,
      pages,
      designPreference,
    }),
    [siteDescription, pageCount, headerContent, footerContent, pages, designPreference]
  );
  const draftJson = useMemo(() => JSON.stringify(draft), [draft]);
  const debouncedDraftJson = useDebounce(draftJson, 1000);

  useEffect(() => {
    if (!restored || typeof window === "undefined") return;
    if (!restoredRef.current) {
      restoredRef.current = true;
      const id = setTimeout(() => {
        saveDraft(window.localStorage, draft);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [restored, draft]);

  useEffect(() => {
    if (!restored || typeof window === "undefined") return;
    if (draftJson !== debouncedDraftJson) return;
    saveDraft(window.localStorage, draft);
  }, [restored, debouncedDraftJson, draftJson, draft]);

  const syncPages = (n: 1 | 2 | 3 | 4 | 5) => {
    setPageCount(n);
    const next: PageInput[] = [];
    for (let i = 0; i < n; i++) {
      next.push(pages[i] ?? defaultPage(i));
      next[i].path = i === 0 ? "/" : `/page-${i + 1}`;
    }
    setPages(next);
  };

  const addSection = (pageIndex: number) => {
    const next = [...pages];
    const page = next[pageIndex];
    const newSection = defaultSection();
    const sections: SectionInput[] = [...page.sections, newSection];
    next[pageIndex] = { ...page, sections };
    setPages(next);
  };

  const insertSectionAfter = (pageIndex: number, afterIndex: number) => {
    const next = [...pages];
    const page = next[pageIndex];
    const newSection = defaultSection();
    const sections: SectionInput[] = [
      ...page.sections.slice(0, afterIndex + 1),
      newSection,
      ...page.sections.slice(afterIndex + 1),
    ];
    next[pageIndex] = { ...page, sections };
    setPages(next);
    setSectionFiles((prev) => {
      const out: Record<string, File> = {};
      Object.entries(prev).forEach(([key, file]) => {
        const [pi, si] = key.split("_").map(Number);
        if (pi !== pageIndex) out[key] = file;
        else if (si <= afterIndex) out[key] = file;
        else out[`${pi}_${si + 1}`] = file;
      });
      return out;
    });
  };

  const moveSectionUp = (pageIndex: number, sectionIndex: number) => {
    if (sectionIndex <= 0) return;
    const next = [...pages];
    const page = next[pageIndex];
    const sections = [...page.sections];
    [sections[sectionIndex - 1], sections[sectionIndex]] = [sections[sectionIndex], sections[sectionIndex - 1]];
    const fixRef = (s: SectionInput, j: number) =>
      s.image?.type === "attach" && s.image.fileRef
        ? { ...s, image: { ...s.image, fileRef: `section_${pageIndex}_${j}` } }
        : s;
    sections[sectionIndex - 1] = fixRef(sections[sectionIndex - 1], sectionIndex - 1);
    sections[sectionIndex] = fixRef(sections[sectionIndex], sectionIndex);
    next[pageIndex] = { ...page, sections };
    setPages(next);
    setSectionFiles((prev) => {
      const out = { ...prev };
      const a = `${pageIndex}_${sectionIndex - 1}`;
      const b = `${pageIndex}_${sectionIndex}`;
      const fileA = prev[a];
      const fileB = prev[b];
      if (fileA !== undefined) out[b] = fileA;
      else delete out[b];
      if (fileB !== undefined) out[a] = fileB;
      else delete out[a];
      return out;
    });
  };

  const moveSectionDown = (pageIndex: number, sectionIndex: number) => {
    const page = pages[pageIndex];
    if (sectionIndex >= page.sections.length - 1) return;
    const next = [...pages];
    const sections = [...page.sections];
    [sections[sectionIndex], sections[sectionIndex + 1]] = [sections[sectionIndex + 1], sections[sectionIndex]];
    const fixRef = (s: SectionInput, j: number) =>
      s.image?.type === "attach" && s.image.fileRef
        ? { ...s, image: { ...s.image, fileRef: `section_${pageIndex}_${j}` } }
        : s;
    sections[sectionIndex] = fixRef(sections[sectionIndex], sectionIndex);
    sections[sectionIndex + 1] = fixRef(sections[sectionIndex + 1], sectionIndex + 1);
    next[pageIndex] = { ...page, sections };
    setPages(next);
    setSectionFiles((prev) => {
      const out = { ...prev };
      const a = `${pageIndex}_${sectionIndex}`;
      const b = `${pageIndex}_${sectionIndex + 1}`;
      const fileA = prev[a];
      const fileB = prev[b];
      if (fileA !== undefined) out[b] = fileA;
      else delete out[b];
      if (fileB !== undefined) out[a] = fileB;
      else delete out[a];
      return out;
    });
  };

  const removeSection = (pageIndex: number, sectionIndex: number) => {
    const next = [...pages];
    const page = next[pageIndex];
    const sec = page.sections.filter((_, j) => j !== sectionIndex);
    if (sec.length < 1) return;
    const isRemovingFirst = sectionIndex === 0;
    const sections = sec.map((s, j) =>
      j >= sectionIndex && s.image?.type === "attach" && s.image.fileRef
        ? { ...s, image: { ...s.image, fileRef: `section_${pageIndex}_${j}` } }
        : s
    );
    next[pageIndex] = {
      ...page,
      sections,
      heroSection: isRemovingFirst ? false : page.heroSection,
    };
    setPages(next);
    setSectionFiles((prev) => {
      const nextF: Record<string, File> = {};
      Object.entries(prev).forEach(([key, file]) => {
        const [pi, si] = key.split("_").map(Number);
        if (pi !== pageIndex) nextF[key] = file;
        else if (si < sectionIndex) nextF[key] = file;
        else if (si > sectionIndex) nextF[`${pi}_${si - 1}`] = file;
      });
      return nextF;
    });
  };

  const sectionFileRef = (pageIndex: number, sectionIndex: number) =>
    `section_${pageIndex}_${sectionIndex}`;

  const setSectionFile = (pageIndex: number, sectionIndex: number, file: File | null) => {
    const key = `${pageIndex}_${sectionIndex}`;
    setSectionFiles((prev) => (file ? { ...prev, [key]: file } : (() => { const n = { ...prev }; delete n[key]; return n; })()));
  };

  const setSectionImageMode = (
    pageIndex: number,
    sectionIndex: number,
    mode: ImageMode,
    file?: File | null
  ) => {
    const next = [...pages];
    const sec = [...next[pageIndex].sections];
    if (mode === "none") {
      sec[sectionIndex] = { ...sec[sectionIndex], image: undefined };
      setSectionFile(pageIndex, sectionIndex, null);
    } else if (mode === "omakase") {
      sec[sectionIndex] = { ...sec[sectionIndex], image: { type: "omakase" } };
      setSectionFile(pageIndex, sectionIndex, null);
    } else {
      const ref = sectionFileRef(pageIndex, sectionIndex);
      sec[sectionIndex] = { ...sec[sectionIndex], image: { type: "attach", fileRef: ref } };
      if (file) setSectionFile(pageIndex, sectionIndex, file);
    }
    next[pageIndex] = { ...next[pageIndex], sections: sec };
    setPages(next);
  };

  const getSectionImageMode = (pageIndex: number, sectionIndex: number): ImageMode => {
    const img = pages[pageIndex].sections[sectionIndex]?.image;
    if (!img) return "none";
    if (img.type === "omakase") return "omakase";
    return "attach";
  };

  const buildInput = (): SiteGenerationInput => {
    return {
      pageCount,
      siteDescription: siteDescription.text.trim() || undefined,
      headerContent: headerContent.text.trim()
        ? { text: headerContent.text.trim(), mode: headerContent.mode === "omakase" ? "complement" : headerContent.mode }
        : undefined,
      footerContent: footerContent.text.trim()
        ? { text: footerContent.text.trim(), mode: footerContent.mode === "omakase" ? "complement" : footerContent.mode }
        : undefined,
      pages: pages.map((p, pi) => ({
        ...p,
        path: pi === 0 ? "/" : `/page-${pi + 1}`,
        sections: p.sections.map((s) => ({
          ...s,
          contentOmakase: (s.contentMode ?? "complement") === "omakase" || !s.content.trim(),
        })),
      })),
      designPreference:
        designPreference.mode === "omakase" || !designPreference.text.trim()
          ? "おまかせ"
          : designPreference.text.trim(),
    };
  };

  const handleClearClick = () => {
    setClearConfirmOpen(true);
  };

  const handleClearConfirm = () => {
    setSiteDescription(defaultCommonBlockNoOmakase());
    setPageCount(1);
    setHeaderContent(defaultCommonBlockNoOmakase());
    setFooterContent(defaultCommonBlockNoOmakase());
    setPages([defaultPage(0)]);
    setDesignPreference(defaultCommonBlock());
    setSectionFiles({});
    setClearConfirmOpen(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(FORM_DRAFT_KEY);
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    router.push("/loading");
    const input = buildInput();
    try {
      const formData = new FormData();
      formData.append("input", JSON.stringify(input));
      Object.entries(sectionFiles).forEach(([key, file]) => {
        const [pi, si] = key.split("_").map(Number);
        formData.append(sectionFileRef(pi, si), file);
      });
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        router.replace(
          `/result?url=${encodeURIComponent(data.url)}&spec=${encodeURIComponent(data.specMarkdown ?? "")}`
        );
        return;
      }
      router.replace(
        `/error?error=${encodeURIComponent(data.error ?? "エラー")}&code=${data.code ?? ""}`
      );
    } catch (err) {
      router.replace(`/error?error=${encodeURIComponent(String(err))}&code=NETWORK_ERROR`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTextBlock = (
    label: string,
    description: string,
    placeholder: string,
    value: string,
    mode: TextMode,
    onChangeValue: (v: string) => void,
    onChangeMode: (m: TextMode) => void,
    noOmakase?: boolean
  ) => {
    const options = noOmakase ? TEXT_MODE_OPTIONS_NO_OMAKASE : TEXT_MODE_OPTIONS;
    const selectValue = noOmakase && mode === "omakase" ? "complement" : mode;
    return (
      <div>
        <label className="block text-sm font-medium text-[var(--fg)] mb-1">{label}</label>
        <p className="text-xs text-[var(--muted)] mb-2">{description}</p>
        <div className="flex gap-2 mb-2">
          <select
            value={selectValue}
            onChange={(e) => onChangeMode(e.target.value as TextMode)}
            className="border border-[var(--accent)]/50 px-2 py-1.5 text-sm rounded-sm text-[var(--fg)]"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          className="w-full border border-[var(--accent)]/50 px-3 py-2 text-sm rounded-sm text-[var(--input-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>
    );
  };

  if (!restored) {
    return (
      <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-light tracking-widest">入力</h1>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">
          ← トップへ
        </Link>
      </div>
      <p className="text-[var(--muted)] text-sm mb-8">
        下の項目を埋めると、その内容でWebサイトが自動で作られます。各項目で「AIおまかせ」「AI補完」「入力内容そのまま」を選べます。
      </p>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* サイトの概要・共通ヘッダー・共通フッター（枠なし・AIおまかせなしで統一） */}
        {renderTextBlock(
          "サイトの概要（何のサイトなのか）",
          "例: 会社のコーポレートサイト / カフェの紹介サイト / 個人のポートフォリオ",
          "例: 〇〇の製品・サービスを紹介するサイト",
          siteDescription.text,
          siteDescription.mode,
          (v) => setSiteDescription((prev) => ({ ...prev, text: v })),
          (m) => setSiteDescription((prev) => ({ ...prev, mode: m })),
          true
        )}
        {renderTextBlock(
          "共通ヘッダー内容",
          "全ページのヘッダーに載せる内容。例: サイトメニューアイコン、会社名、ロゴテキスト",
          "例: サイトメニューアイコン",
          headerContent.text,
          headerContent.mode,
          (v) => setHeaderContent((prev) => ({ ...prev, text: v })),
          (m) => setHeaderContent((prev) => ({ ...prev, mode: m })),
          true
        )}
        {renderTextBlock(
          "共通フッター内容",
          "全ページのフッターに載せる文言。例: 住所・電話番号・コピーライト",
          "例: 〒100-0001 東京都〇〇区〇〇 1-2-3 / © 2024 株式会社サンプル",
          footerContent.text,
          footerContent.mode,
          (v) => setFooterContent((prev) => ({ ...prev, text: v })),
          (m) => setFooterContent((prev) => ({ ...prev, mode: m })),
          true
        )}

        {/* サイトのページ数 */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1">サイトのページ数</label>
          <p className="text-xs text-[var(--muted)] mb-2">例: トップ・会社概要・お問い合わせなら 3ページ</p>
          <select
            value={pageCount}
            onChange={(e) => syncPages(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="border border-[var(--accent)]/50 px-3 py-2 w-28 rounded-sm text-[var(--fg)]"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}ページ</option>
            ))}
          </select>
        </div>

        {/* 各ページ詳細 */}
        {pages.map((p, i) => (
          <div key={i} className="border border-[var(--accent)]/50 p-4 space-y-4 rounded-sm">
            <h2 className="text-sm font-medium text-[var(--fg)]">ページ {i + 1}</h2>

            {renderTextBlock(
              "ページの名前",
              "メニューやタイトルに表示。例: トップ / 会社概要 / サービス紹介",
              getPlaceholderForPage(i).name,
              p.name,
              p.nameMode ?? "as_is",
              (v) => {
                const next = [...pages];
                next[i] = { ...next[i], name: v };
                setPages(next);
              },
              (m) => {
                const next = [...pages];
                next[i] = { ...next[i], nameMode: m };
                setPages(next);
              }
            )}

            <div>
              <p className="text-xs text-[var(--muted)] mb-2">
                ページ詳細
              </p>
              {p.sections.map((s, j) => (
                <div key={j} className="pl-3 border-l-2 border-[var(--muted)]/30 mb-4">
                  <div className="flex gap-2 mb-1">
                    <select
                      value={s.headingMode ?? "as_is"}
                      onChange={(e) => {
                        const next = [...pages];
                        const sec = [...next[i].sections];
                        sec[j] = { ...sec[j], headingMode: e.target.value as TextMode };
                        next[i] = { ...next[i], sections: sec };
                        setPages(next);
                      }}
                      className="border border-[var(--accent)]/50 px-2 py-1 text-sm rounded-sm text-[var(--fg)]"
                    >
                      {TEXT_MODE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder={j === 0 ? getPlaceholderForPage(i).heading : "例: 会社概要 / 実績 / お問い合わせ"}
                    value={s.heading}
                    onChange={(e) => {
                      const next = [...pages];
                      const sec = [...next[i].sections];
                      sec[j] = { ...sec[j], heading: e.target.value };
                      next[i] = { ...next[i], sections: sec };
                      setPages(next);
                    }}
                    className="w-full border border-[var(--accent)]/50 px-2 py-1.5 text-sm mb-1 rounded-sm text-[var(--input-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  <div className="flex gap-2 mb-1">
                    <select
                      value={s.contentMode ?? "complement"}
                      onChange={(e) => {
                        const next = [...pages];
                        const sec = [...next[i].sections];
                        sec[j] = { ...sec[j], contentMode: e.target.value as TextMode };
                        next[i] = { ...next[i], sections: sec };
                        setPages(next);
                      }}
                      className="border border-[var(--accent)]/50 px-2 py-1 text-sm rounded-sm text-[var(--fg)]"
                    >
                      {TEXT_MODE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder={j === 0 ? getPlaceholderForPage(i).content : "例: 私たちは〇〇を提供しています。空欄でAI補完・おまかせ可。"}
                    value={s.content}
                    className="w-full border border-[var(--accent)]/50 px-2 py-1.5 text-sm min-h-[72px] rounded-sm text-[var(--input-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    rows={3}
                    onChange={(e) => {
                      const next = [...pages];
                      const sec = [...next[i].sections];
                      sec[j] = { ...sec[j], content: e.target.value };
                      next[i] = { ...next[i], sections: sec };
                      setPages(next);
                    }}
                  />
                  <div className="mt-2">
                    <label className="text-xs text-[var(--muted)] mr-2">このブロックの画像:</label>
                    <select
                      value={getSectionImageMode(i, j)}
                      onChange={(e) => {
                        const mode = e.target.value as ImageMode;
                        setSectionImageMode(i, j, mode);
                        if (mode === "attach") {
                          setTimeout(() => sectionFileInputRefs.current[`${i}_${j}`]?.click(), 0);
                        }
                      }}
                      className="border border-[var(--accent)]/50 px-2 py-1 text-sm rounded-sm mr-2 text-[var(--fg)]"
                    >
                      {IMAGE_MODE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {getSectionImageMode(i, j) === "attach" && (
                      <>
                        <input
                          ref={(el) => { sectionFileInputRefs.current[`${i}_${j}`] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSectionImageMode(i, j, "attach", file);
                              setSectionFile(i, j, file);
                            }
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => sectionFileInputRefs.current[`${i}_${j}`]?.click()}
                          className="text-xs text-[var(--muted)] hover:text-[var(--fg)] border border-dashed px-2 py-1 rounded-sm"
                        >
                          画像を選択
                        </button>
                        {sectionFiles[`${i}_${j}`] && (
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            {sectionFiles[`${i}_${j}`].name}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center mt-2">
                    <button
                      type="button"
                      onClick={() => insertSectionAfter(i, j)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--fg)] border border-dashed border-[var(--muted)]/50 px-2 py-1 rounded-sm"
                    >
                      + ブロックを追加
                    </button>
                    {p.sections.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => removeSection(i, j)}
                          className="text-xs text-[var(--muted)] hover:text-red-400 border border-dashed border-[var(--muted)]/50 px-2 py-1 rounded-sm"
                        >
                          - ブロックを削除
                        </button>
                        {j > 0 && (
                          <button
                            type="button"
                            onClick={() => moveSectionUp(i, j)}
                            className="text-xs text-[var(--muted)] hover:text-[var(--fg)] border border-dashed border-[var(--muted)]/50 px-2 py-1 rounded-sm"
                          >
                            ↑ 上へ
                          </button>
                        )}
                        {j < p.sections.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveSectionDown(i, j)}
                            className="text-xs text-[var(--muted)] hover:text-[var(--fg)] border border-dashed border-[var(--muted)]/50 px-2 py-1 rounded-sm"
                          >
                            ↓ 下へ
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 見た目のイメージ */}
        {renderTextBlock(
          "見た目のイメージ",
          "ミニマル・コーポレート・カジュアルなど。例: シンプルで落ち着いた / ポップで親しみやすい",
          "例: ミニマル / コーポレート / 空欄でおまかせ",
          designPreference.text,
          designPreference.mode,
          (v) => setDesignPreference((prev) => ({ ...prev, text: v })),
          (m) => setDesignPreference((prev) => ({ ...prev, mode: m }))
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 border border-[var(--accent)] text-[var(--fg)] text-sm tracking-wider hover:bg-white/5 disabled:opacity-50 rounded-sm"
          >
            {submitting ? "生成中…" : "サイトを作成する"}
          </button>
          <button
            type="button"
            onClick={handleClearClick}
            disabled={submitting}
            className="px-6 py-3 border border-[var(--muted)]/50 text-[var(--muted)] text-sm tracking-wider hover:bg-white/5 hover:text-[var(--fg)] disabled:opacity-50 rounded-sm"
          >
            入力内容をクリア
          </button>
        </div>

        {clearConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" aria-modal="true" role="dialog">
            <div className="bg-[#1a1a1a] border border-[var(--accent)] rounded-sm p-6 max-w-sm mx-4 shadow-lg">
              <p className="text-[var(--fg)] text-sm mb-6">入力内容をすべてクリアします。よろしいですか？</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(false)}
                  className="px-4 py-2 border border-[var(--muted)]/50 text-[var(--muted)] text-sm rounded-sm hover:bg-white/5"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleClearConfirm}
                  className="px-4 py-2 border border-red-500/70 text-red-400 text-sm rounded-sm hover:bg-red-500/10"
                >
                  クリアする
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
