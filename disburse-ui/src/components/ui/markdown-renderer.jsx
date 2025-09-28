import React, { Suspense } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

export function MarkdownRenderer({ children }) {
  return (
    <div className="space-y-3">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={COMPONENTS}
      >
        {children}
      </Markdown>
    </div>
  );
}

const HighlightedPre = React.memo(async ({ children, language, ...props }) => {
  const { codeToTokens, bundledLanguages } = await import("shiki");

  if (!(language in bundledLanguages)) {
    return <pre {...props}>{children}</pre>;
  }

  const { tokens } = await codeToTokens(children, {
    lang: language,
    defaultColor: false,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return (
    <pre {...props}>
      <code>
        {tokens.map((line, lineIndex) => (
          <>
            <span key={lineIndex}>
              {line.map((token, tokenIndex) => {
                const style =
                  typeof token.htmlStyle === "string"
                    ? undefined
                    : token.htmlStyle;

                return (
                  <span
                    key={tokenIndex}
                    className="text-shiki-light bg-shiki-light-bg dark:text-shiki-dark dark:bg-shiki-dark-bg"
                    style={style}
                  >
                    {token.content}
                  </span>
                );
              })}
            </span>
            {lineIndex !== tokens.length - 1 && "\n"}
          </>
        ))}
      </code>
    </pre>
  );
});
HighlightedPre.displayName = "HighlightedCode";

const CodeBlock = ({ children, className, language, ...restProps }) => {
  const code =
    typeof children === "string"
      ? children
      : childrenTakeAllStringContents(children);

  const preClass = cn(
    "overflow-x-scroll rounded-md border bg-background/50 p-4 font-mono text-sm [scrollbar-width:none]",
    className
  );

  return (
    <div className="group/code relative mb-4">
      <Suspense
        fallback={
          <pre className={preClass} {...restProps}>
            {children}
          </pre>
        }
      >
        <HighlightedPre language={language} className={preClass}>
          {code}
        </HighlightedPre>
      </Suspense>
      <div className="invisible absolute right-2 top-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-all duration-200 group-hover/code:visible group-hover/code:opacity-100">
        <CopyButton content={code} copyMessage="Copied code to clipboard" />
      </div>
    </div>
  );
};

function childrenTakeAllStringContents(element) {
  if (typeof element === "string") {
    return element;
  }

  if (element?.props?.children) {
    let children = element.props.children;

    if (Array.isArray(children)) {
      return children
        .map((child) => childrenTakeAllStringContents(child))
        .join("");
    } else {
      return childrenTakeAllStringContents(children);
    }
  }

  return "";
}

const COMPONENTS = {
  h1: withClass("h1", "text-2xl font-medium tracking-tight"),
  h2: withClass("h2", "text-xl font-medium tracking-tight"),
  h3: withClass("h3", "text-lg font-medium tracking-tight"),
  h4: withClass("h4", "text-base font-medium tracking-tight"),
  h5: withClass("h5", "text-sm font-medium tracking-tight"),
  strong: withClass("strong", "font-medium"),
  a: withClass(
    "a",
    "text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
  ),
  blockquote: withClass(
    "blockquote",
    "border-l-2 border-border/50 pl-4 text-muted-foreground"
  ),
  code: ({ children, className, node, ...rest }) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <CodeBlock className={className} language={match[1]} {...rest}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className={cn(
          "font-mono text-sm [:not(pre)>&]:rounded-md [:not(pre)>&]:bg-muted/50 [:not(pre)>&]:px-1.5 [:not(pre)>&]:py-0.5"
        )}
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => children,
  ol: withClass("ol", "list-decimal space-y-2 pl-6 text-sm"),
  ul: withClass("ul", "list-disc space-y-2 pl-6 text-sm"),
  li: withClass("li", "my-1.5"),
  table: withClass(
    "table",
    "w-full border-collapse overflow-y-auto rounded-md border border-border/50 text-sm"
  ),
  th: withClass(
    "th",
    "border border-border/50 px-4 py-2 text-left font-medium [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  td: withClass(
    "td",
    "border border-border/50 px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  tr: withClass("tr", "m-0 border-t border-border/50 p-0 even:bg-muted/50"),
  p: withClass("p", "whitespace-pre-wrap text-sm leading-7"),
  hr: withClass("hr", "border-border/50"),
  img: ({ src, alt, ...props }) => {
    // Handle data URLs (like QR codes)
    if (src && (src.startsWith("data:") || src.startsWith("http"))) {
      return (
        <img
          src={src}
          alt={alt || "Image"}
          className="max-w-full h-auto rounded-md border border-border/50 my-2"
          {...props}
        />
      );
    }
    return null;
  },
};

function withClass(Tag, classes) {
  const Component = ({ node, ...props }) => (
    <Tag className={classes} {...props} />
  );
  Component.displayName = Tag;
  return Component;
}

export default MarkdownRenderer;
