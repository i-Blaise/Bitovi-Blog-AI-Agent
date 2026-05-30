/* global React, lucide */
// ─────────────────────────────────────────────────────────────────────────
// Bitovi RAG Chat — data, helpers, and shared primitives
// ─────────────────────────────────────────────────────────────────────────

// Lucide IconNode shape is [tag, attrs, children]; render the svg's children.
function renderIconNode(node, key) {
  const [tag, attrs, children] = node;
  return React.createElement(
    tag,
    { key, ...attrs },
    Array.isArray(children) ? children.map((c, i) => renderIconNode(c, i)) : null
  );
}
function Icon({ name, size = 18, strokeWidth = 2, className = '', style }) {
  const icon = (lucide.icons && lucide.icons[name]) || null;
  if (!icon) return null;
  const children = Array.isArray(icon[2]) ? icon[2] : [];
  return React.createElement(
    'svg',
    {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
      className, style, 'aria-hidden': true,
    },
    children.map((c, i) => renderIconNode(c, i))
  );
}

// Tiny markdown: paragraphs, **bold**, `code`, and grouped "- " bullet lists.
function renderMarkdown(text) {
  const inline = (str) => {
    const parts = [];
    str.split(/(`[^`]+`)/g).forEach((seg, ci) => {
      if (seg.startsWith('`') && seg.endsWith('`')) {
        parts.push(<code key={'c' + ci}>{seg.slice(1, -1)}</code>);
        return;
      }
      seg.split(/(\*\*[^*]+\*\*)/g).forEach((b, bi) => {
        if (b.startsWith('**') && b.endsWith('**')) parts.push(<strong key={'c' + ci + 'b' + bi}>{b.slice(2, -2)}</strong>);
        else if (b) parts.push(<React.Fragment key={'c' + ci + 't' + bi}>{b}</React.Fragment>);
      });
    });
    return parts;
  };
  return text.trim().split(/\n{2,}/).map((block, i) => {
    const lines = block.split('\n');
    const parts = [];
    let bullets = [];
    const flush = () => {
      if (bullets.length) {
        const items = bullets.slice();
        parts.push(<ul key={'u' + i + '-' + parts.length}>{items.map((b, bi) => <li key={bi}>{inline(b)}</li>)}</ul>);
        bullets = [];
      }
    };
    lines.forEach((line, li) => {
      const t = line.trim();
      if (t.startsWith('- ')) bullets.push(t.slice(2));
      else if (t) { flush(); parts.push(<p key={'p' + i + '-' + li}>{inline(t)}</p>); }
    });
    flush();
    return <React.Fragment key={i}>{parts}</React.Fragment>;
  });
}

// ── Example questions — mapped 1:1 to the demo responses below ─────────────
const EXAMPLE_QUESTIONS = [
  { text: "What is Bitovi's latest blog post about?", icon: 'Newspaper' },
  { text: 'Show me all Bitovi articles about DevOps', icon: 'Server' },
  { text: 'How many articles does Bitovi have about AI?', icon: 'Sparkles' },
  { text: 'What testing tools does Bitovi recommend?', icon: 'FlaskConical' },
];

// ── Category tag styles (subtle dot + neutral chip) ────────────────────────
const CATEGORY_STYLES = {
  DevOps: { dot: '#e0a830' },
  React: { dot: '#5b9ff0' },
  AI: { dot: '#3fb6a8' },
  Testing: { dot: '#d98b5f' },
  CanJS: { dot: '#e63329' },
};

// ── Rotating demo responses (real Bitovi blog sources, dated + categorized) ─
const AI_RESPONSES = [
  {
    certainty: 'HIGH',
    score: 92,
    metrics: { chunks: 7, retrieval: 94 },
    answer:
      "The most recently indexed post is **“Getting Started with BitOps v2.0: Terraform”** (Oct 6, 2023).\n\nIt walks through deploying infrastructure with the new BitOps v2.0, whose headline change is a **plugin architecture** — Terraform, Ansible, CloudFormation, Helm, `kubectl`, and the AWS CLI now ship in the default images.\n\nThe core idea is still the **OpsRepo**: a single repository that stores each environment's IaC config in an `<environment>/<tool>` folder structure, so one command can stand up infrastructure and install your app.",
    sources: [
      { title: 'Getting Started with BitOps v2.0: Terraform', slug: 'getting-started-with-bitops-v2-terraform', date: 'Oct 6, 2023', category: 'DevOps', relevance: 96, excerpt: 'Deploy Terraform with the new plugin-based BitOps v2.0 engine and a single OpsRepo command.' },
      { title: 'DevOps Consulting: Continuous Delivery', slug: 'devops-consulting-continuous-delivery', date: 'Oct 5, 2023', category: 'DevOps', relevance: 81, excerpt: 'How continuous delivery automates deployments, decreases dev time, and lowers MTTR.' },
    ],
    retrievedChunks: [
      { score: 96, source: 'getting-started-with-bitops-v2-terraform', text: 'BitOps v2.0 is here and more powerful than ever. In this post, learn how to get started by deploying Terraform. New features include support for plugins and a more powerful engine.' },
      { score: 89, source: 'getting-started-with-bitops-v2-terraform', text: 'Each plugin is a deployment tool such as Terraform or Helm. We loaded Terraform, Ansible, CloudFormation, Helm, kubectl, and the AWS CLI into our default images.' },
      { score: 74, source: 'devops-consulting-continuous-delivery', text: 'Infrastructure-as-code defines the state of the infrastructure in code — a versioned blueprint that lets your efforts scale far more efficiently than ClickOps.' },
    ],
  },
  {
    certainty: 'HIGH',
    score: 88,
    metrics: { chunks: 9, retrieval: 90 },
    answer:
      "Bitovi's DevOps writing is anchored by the open-source **BitOps** project. The indexed set includes:\n\n- **Introducing BitOps** — the Operations Repo pattern for describing infrastructure across environments.\n- **BitOps + Terraform** — managing multiple environments and Terraform state.\n- **Deploy an EKS Cluster & Helm Chart** — declarative infra for Kubernetes with Terraform + Helm.\n- **DevOps Consulting: Continuous Delivery** — pipeline runners, IaC, and MTTR.\n\nThe throughline: wrap Terraform, Ansible, and Helm in a single `OpsRepo` so deployments are reproducible and pipeline-agnostic.",
    sources: [
      { title: 'Introducing BitOps', slug: 'introducing-bitops', date: 'Dec 6, 2022', category: 'DevOps', relevance: 92, excerpt: 'Automate provisioning and configuration of cloud infrastructure with the BitOps Operations Repo.' },
      { title: 'Deploy an EKS Cluster and Helm Chart', slug: 'eks-helm-bitops', date: 'Oct 5, 2022', category: 'DevOps', relevance: 86, excerpt: 'Create and manage an AWS EKS cluster with Terraform and deploy a Helm chart via BitOps.' },
      { title: 'BitOps + Terraform', slug: 'bitops-terraform', date: 'Oct 5, 2022', category: 'DevOps', relevance: 83, excerpt: 'Managing multiple environments and Terraform states with BitOps workspaces.' },
    ],
    retrievedChunks: [
      { score: 92, source: 'introducing-bitops', text: 'BitOps describes your infrastructure and the artifacts deployed onto it for multiple environments in a single place called an Operations Repo.' },
      { score: 86, source: 'eks-helm-bitops', text: 'We create an operations repo that manages an AWS EKS cluster using Terraform and deploys a Helm chart to the cluster, orchestrated by BitOps.' },
      { score: 83, source: 'bitops-terraform', text: 'BitOps works well with different deployment tools; today\u2019s focus is Terraform. By the end you will have used BitOps to create a prod and test AWS VPC.' },
      { score: 71, source: 'devops-consulting-continuous-delivery', text: 'With BitOps you can create a VM with Terraform then provision it with Ansible, or stand up a Kubernetes cluster with Terraform and install components with Helm.' },
    ],
  },
  {
    certainty: 'MEDIUM',
    score: 71,
    metrics: { chunks: 5, retrieval: 68 },
    answer:
      "AI is an **emerging topic** on the blog rather than a deep category — the index currently surfaces a small handful of posts.\n\nThe clearest example is **“5 Quick Tips for Writing More Readable React Code [ChatGPT Experiment]”**, where more than half the article was AI-generated as a hands-on test of ChatGPT for technical writing.\n\nI'd treat the exact count as approximate — retrieval found only sparse AI-tagged matches, so newer posts may not yet be indexed.",
    sources: [
      { title: '5 Quick Tips for Writing More Readable React Code [ChatGPT Experiment]', slug: '5-quick-tips-for-writing-more-readable-react-code-chatgpt-experiment', date: 'Oct 3, 2023', category: 'AI', relevance: 72, excerpt: 'A hands-on experiment letting ChatGPT draft a technical post — more than half is AI-generated.' },
    ],
    retrievedChunks: [
      { score: 72, source: '5-quick-tips-for-writing-more-readable-react-code-chatgpt-experiment', text: 'ChatGPT is hot right now, so I experimented with letting it write a blog post. The following is more than half AI-generated.' },
      { score: 54, source: '5-quick-tips-for-writing-more-readable-react-code-chatgpt-experiment', text: 'While the model is training on other web content, it combines those sources in a unique way — not unlike how content farms operate.' },
    ],
  },
  {
    certainty: 'MEDIUM',
    score: 77,
    metrics: { chunks: 6, retrieval: 79 },
    answer:
      "From the indexed posts, Bitovi's testing guidance clusters around two ideas:\n\n- **Build for testability** — keep components small and focused (under ~100–200 lines, fewer than ~3 state values) so they're easy to unit test.\n- **Lean on framework tooling** — the CanJS guides cover programmatic component creation for tests and debugging tools like `logStack` and the ViewModel inspector to trace state.\n\nNote: the blog leans more on testing *practices* than a single recommended tool list, so treat this as directional.",
    sources: [
      { title: 'CanJS 5.0', slug: 'canjs-5', date: 'Jul 18, 2018', category: 'Testing', relevance: 80, excerpt: 'Creating components programmatically — a technique built for the CanJS testing guide.' },
      { title: 'CanJS Debugging Tutorial', slug: 'canjs-debugging-tutorial', date: 'Oct 11, 2018', category: 'Testing', relevance: 74, excerpt: 'logStack and the ViewModel inspector make it easy to trace why state changed.' },
      { title: '5 Quick Tips for Writing More Readable React Code', slug: '5-quick-tips-for-writing-more-readable-react-code-chatgpt-experiment', date: 'Oct 3, 2023', category: 'React', relevance: 63, excerpt: 'Keep components small and focused so they stay easy to reason about and test.' },
    ],
    retrievedChunks: [
      { score: 80, source: 'canjs-5', text: 'The ability to create components programmatically was necessary for completing the testing guide. Component instances make creating dynamic widgets easier.' },
      { score: 74, source: 'canjs-debugging-tutorial', text: 'logStack lays out exactly why something changed; inspect an element and CanJS tells you every value that composed it.' },
      { score: 61, source: '5-quick-tips-for-writing-more-readable-react-code-chatgpt-experiment', text: 'Is the component file longer than 100\u2013200 lines? Tracking more than 3 state values? That is a signal to break it up.' },
    ],
  },
];

const CERTAINTY_STYLES = {
  HIGH: { label: 'High confidence', dot: '#54b87a', text: '#9fe0b6', bg: 'rgba(84,184,122,0.12)', border: 'rgba(84,184,122,0.40)', blurb: 'Confidence reflects how strongly the retrieved sources support this answer. HIGH means multiple passages closely matched your question.' },
  MEDIUM: { label: 'Medium confidence', dot: '#e0a830', text: '#f0cf86', bg: 'rgba(224,168,48,0.12)', border: 'rgba(224,168,48,0.40)', blurb: 'MEDIUM means the sources are relevant but partial — verify specifics before relying on them in production.' },
  LOW: { label: 'Low confidence', dot: '#e6584a', text: '#f3a89f', bg: 'rgba(230,88,74,0.12)', border: 'rgba(230,88,74,0.42)', blurb: 'LOW means retrieval found weak or sparse matches. The answer is a best-effort starting point, not a grounded citation.' },
};

// Color a relevance/confidence percentage along green → amber → red.
function relevanceColor(pct) {
  if (pct >= 80) return '#54b87a';
  if (pct >= 60) return '#e0a830';
  return '#e6584a';
}

// ── Simulated ingestion log (sim timestamps + progress thresholds) ─────────
const INGEST_LOG = [
  { t: '00:03', at: 3, text: 'Fetching sitemap from bitovi.com ...' },
  { t: '00:47', at: 9, text: 'Discovered 142 blog URLs' },
  { t: '01:24', at: 15, text: 'Spinning up scraper workers (\u00d78)' },
  { t: '02:15', at: 24, text: 'Scraping: /blog/getting-started-with-bitops-v2-terraform' },
  { t: '03:51', at: 33, text: 'Scraping: /blog/react-architecture-tips-and-tricks' },
  { t: '05:30', at: 45, text: 'Chunking articles into embeddings ...' },
  { t: '07:08', at: 56, text: 'Embedded 1,204 chunks \u00b7 text-embedding-3-small' },
  { t: '09:12', at: 67, text: 'Upserting vectors to Pinecone ...' },
  { t: '11:36', at: 78, text: 'Indexed 96 / 138 articles' },
  { t: '13:20', at: 90, text: 'Refreshing metadata cache & relevance scores' },
  { t: '14:58', at: 100, text: 'Ingestion complete. 138 articles indexed.' },
];

// Non-linear progress curve: quick start, slow mid, finish at the end.
const PROGRESS_CURVE = [[0, 0], [0.08, 22], [0.22, 38], [0.45, 52], [0.68, 70], [0.88, 92], [1, 100]];
function curveProgress(frac) {
  const pts = PROGRESS_CURVE;
  for (let i = 1; i < pts.length; i++) {
    if (frac <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const k = (frac - x0) / (x1 - x0 || 1);
      return y0 + (y1 - y0) * k;
    }
  }
  return 100;
}
const INGEST_DURATION_MS = 85000;

// ── System observability metrics ──────────────────────────────────────────
const SYSTEM_STATS = [
  { label: 'Indexed articles', value: '138', unit: 'documents', icon: 'FileText', status: 'ok' },
  { label: 'Last indexed', value: 'May 28, 2026', unit: '11:42 AM', icon: 'Clock', status: 'ok' },
  { label: 'Embedding model', value: 'text-embedding-3-small', unit: '1536-dim', icon: 'Boxes', status: 'ok' },
  { label: 'Generation model', value: 'claude-sonnet-4', unit: 'temp 0.2', icon: 'Sparkles', status: 'ok' },
];

Object.assign(window, {
  Icon, renderMarkdown,
  EXAMPLE_QUESTIONS, AI_RESPONSES, CERTAINTY_STYLES, CATEGORY_STYLES, relevanceColor,
  INGEST_LOG, PROGRESS_CURVE, curveProgress, INGEST_DURATION_MS, SYSTEM_STATS,
});
