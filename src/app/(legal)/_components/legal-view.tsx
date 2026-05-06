import ReactMarkdown from "react-markdown";

export function LegalView({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-sm [&_blockquote]:my-3 [&_code]:bg-neutral-100 [&_code]:dark:bg-neutral-800 [&_code]:px-1 [&_code]:rounded">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}
